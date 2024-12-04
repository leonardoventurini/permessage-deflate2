var PermessageDeflate = require('../lib/permessage_deflate'),
    _zlib = require('zlib'),
    test = require('jstest').Test

test.describe("ServerSession", function() { with(this) {
  before(function() { with(this) {
    this.deflate  = zlibMock()
    this.inflate  = zlibMock()
    this.level    = _zlib.Z_DEFAULT_LEVEL
    this.memLevel = _zlib.Z_DEFAULT_MEMLEVEL
    this.strategy = _zlib.Z_DEFAULT_STRATEGY

    this.ext      = PermessageDeflate.configure(options)
    this.zlib     = {}
    this.session  = ext.configure({ zlib: zlib }).createServerSession([offer])

    this.message  = { data: "hello", rsv1: true }
  }})

  define("zlibMock", function() {
    var stream = {}

    this.stub(stream, "on").given("data").yields([new Buffer([0x00, 0x00, 0xff, 0xff])])
    this.stub(stream, "on").given("error", this.instanceOf(Function))
    this.stub(stream, "removeListener")

    this.stub(stream, "write")
    this.stub(stream, "flush").yields([])
    this.stub(stream, "close").raises(new Error("unexpected close()"))

    return stream
  })

  define("options", {})
  define("offer",   {})

  define("response", function() {
    if (this._response === undefined) this._response = this.session.generateResponse()
    return this._response
  })

  define("processIncomingMessage", function() {
    this.session.processIncomingMessage(this.message, function() {})
  })

  define("processOutgoingMessage", function() {
    this.session.processOutgoingMessage(this.message, function() {})
  })

  describe("with default options", function() { with(this) {
    describe("with an empty offer", function() { with(this) {
      it("generates an emoty response", function() { with(this) {
        assertEqual( {}, response() )
      }})

      it("uses context takeover and 15 window bits for inflating incoming messages", function() { with(this) {
        response()
        expect(zlib, "createInflateRaw").given({ windowBits: 15 }).exactly(1).returning(inflate)
        processIncomingMessage()
        processIncomingMessage()
      }})

      it("uses context takeover and 15 window bits for deflating outgoing messages", function() { with(this) {
        response()
        expect(zlib, "createDeflateRaw").given({ windowBits: 15, level: level, memLevel: memLevel, strategy: strategy }).exactly(1).returning(deflate)
        processOutgoingMessage()
        processOutgoingMessage()
      }})
    }})

    describe("when the offer includes server_no_context_takeover", function() { with(this) {
      define("offer", { server_no_context_takeover: true })

      it("includes server_no_context_takeover in the response", function() { with(this) {
        assertEqual( { server_no_context_takeover: true }, response() )
      }})

      it("uses no context takeover and 15 window bits for deflating outgoing messages", function() { with(this) {
        response()
        expect(zlib, "createDeflateRaw").given({ windowBits: 15, level: level, memLevel: memLevel, strategy: strategy }).exactly(2).returning(deflate)
        expect(deflate, "close").exactly(2)
        processOutgoingMessage()
        processOutgoingMessage()
      }})

      it("catches errors thrown by zlib", function() { with(this) {
        response()
        stub(zlib, "createDeflateRaw").returning(deflate)
        assertNothingThrown(function() { processOutgoingMessage() })
      }})
    }})

    describe("when the offer includes client_no_context_takeover", function() { with(this) {
      define("offer", { client_no_context_takeover: true })

      it("includes client_no_context_takeover in the response", function() { with(this) {
        assertEqual( { client_no_context_takeover: true }, response() )
      }})

      it("uses no context takeover and 15 window bits for inflating incoming messages", function() { with(this) {
        response()
        expect(zlib, "createInflateRaw").given({ windowBits: 15 }).exactly(2).returning(inflate)
        expect(inflate, "close").exactly(2)
        processIncomingMessage()
        processIncomingMessage()
      }})

      it("catches errors thrown by zlib", function() { with(this) {
        response()
        stub(zlib, "createInflateRaw").returning(inflate)
        assertNothingThrown(function() { processIncomingMessage() })
      }})
    }})

    describe("when the offer includes server_max_window_bits", function() { with(this) {
      define("offer", { server_max_window_bits: 13 })

      it("includes server_max_window_bits in the response", function() { with(this) {
        assertEqual( { server_max_window_bits: 13 }, response() )
      }})

      it("uses context takeover and 13 window bits for deflating outgoing messages", function() { with(this) {
        response()
        expect(zlib, "createDeflateRaw").given({ windowBits: 13, level: level, memLevel: memLevel, strategy: strategy }).exactly(1).returning(deflate)
        processOutgoingMessage()
        processOutgoingMessage()
      }})
    }})

    describe("when the offer includes invalid server_max_window_bits", function() { with(this) {
      define("offer", { server_max_window_bits: 20 })

      it("does not create a session", function() { with(this) {
        assertEqual( null, session )
      }})
    }})

    describe("when the offer includes client_max_window_bits", function() { with(this) {
      define("offer", { client_max_window_bits: true })

      it("does not include a client_max_window_bits hint in the response", function() { with(this) {
        assertEqual( {}, response() )
      }})

      it("uses context takeover and 15 window bits for inflating incoming messages", function() { with(this) {
        response()
        expect(zlib, "createInflateRaw").given({ windowBits: 15 }).exactly(1).returning(inflate)
        processIncomingMessage()
        processIncomingMessage()
      }})
    }})

    describe("when the offer includes a client_max_window_bits hint", function() { with(this) {
      define("offer", { client_max_window_bits: 13 })

      it("includes a client_max_window_bits hint in the response", function() { with(this) {
        assertEqual( { client_max_window_bits: 13 }, response() )
      }})

      it("uses context takeover and 13 window bits for inflating incoming messages", function() { with(this) {
        response()
        expect(zlib, "createInflateRaw").given({ windowBits: 13 }).exactly(1).returning(inflate)
        processIncomingMessage()
        processIncomingMessage()
      }})
    }})

    describe("when the offer includes invalid client_max_window_bits", function() { with(this) {
      define("offer", { client_max_window_bits: 20 })

      it("does not create a session", function() { with(this) {
        assertEqual( null, session )
      }})
    }})
  }})

  describe("with noContextTakeover", function() { with(this) {
    define("options", { noContextTakeover: true })

    describe("with an empty offer", function() { with(this) {
      it("includes server_no_context_takeover in the response", function() { with(this) {
        assertEqual( { server_no_context_takeover: true }, response() )
      }})

      it("uses no context takeover and 15 window bits for deflating outgoing messages", function() { with(this) {
        response()
        expect(zlib, "createDeflateRaw").given({ windowBits: 15, level: level, memLevel: memLevel, strategy: strategy }).exactly(2).returning(deflate)
        expect(deflate, "close").exactly(2)
        processOutgoingMessage()
        processOutgoingMessage()
      }})
    }})
  }})

  describe("with maxWindowBits", function() { with(this) {
    define("options", { maxWindowBits: 12 })

    describe("with an empty offer", function() { with(this) {
      it("does not include server_max_window_bits in the response", function() { with(this) {
        assertEqual( {}, response() )
      }})

      it("uses context takeover and 12 window bits for deflating outgoing messages", function() { with(this) {
        response()
        expect(zlib, "createDeflateRaw").given({ windowBits: 12, level: level, memLevel: memLevel, strategy: strategy }).exactly(1).returning(deflate)
        processOutgoingMessage()
        processOutgoingMessage()
      }})
    }})

    describe("when the offer has higher server_max_window_bits", function() { with(this) {
      define("offer", { server_max_window_bits: 13 })

      it("includes server_max_window_bits in the response", function() { with(this) {
        assertEqual( { server_max_window_bits: 12 }, response() )
      }})

      it("uses context takeover and 12 window bits for deflating outgoing messages", function() { with(this) {
        response()
        expect(zlib, "createDeflateRaw").given({ windowBits: 12, level: level, memLevel: memLevel, strategy: strategy }).exactly(1).returning(deflate)
        processOutgoingMessage()
        processOutgoingMessage()
      }})
    }})

    describe("when the offer has lower server_max_window_bits", function() { with(this) {
      define("offer", { server_max_window_bits: 11 })

      it("includes server_max_window_bits in the response", function() { with(this) {
        assertEqual( { server_max_window_bits: 11 }, response() )
      }})

      it("uses context takeover and 11 window bits for deflating outgoing messages", function() { with(this) {
        response()
        expect(zlib, "createDeflateRaw").given({ windowBits: 11, level: level, memLevel: memLevel, strategy: strategy }).exactly(1).returning(deflate)
        processOutgoingMessage()
        processOutgoingMessage()
      }})
    }})
  }})

  describe("with requestNoContextTakeover", function() { with(this) {
    define("options", { requestNoContextTakeover: true })

    describe("with an empty offer", function() { with(this) {
      it("includes client_no_context_takeover in the response", function() { with(this) {
        assertEqual( { client_no_context_takeover: true }, response() )
      }})

      it("uses no context takeover and 15 window bits for inflating incoming messages", function() { with(this) {
        response()
        expect(zlib, "createInflateRaw").given({ windowBits: 15 }).exactly(2).returning(inflate)
        expect(inflate, "close").exactly(2)
        processIncomingMessage()
        processIncomingMessage()
      }})
    }})
  }})

  describe("with requestMaxWindowBits", function() { with(this) {
    define("options", { requestMaxWindowBits: 11 })

    describe("with an empty offer", function() { with(this) {
      it("does not include client_max_window_bits in the response", function() { with(this) {
        assertEqual( {}, response() )
      }})

      it("uses context takeover and 15 window bits for inflating incoming messages", function() { with(this) {
        response()
        expect(zlib, "createInflateRaw").given({ windowBits: 15 }).exactly(1).returning(inflate)
        processIncomingMessage()
        processIncomingMessage()
      }})
    }})

    describe("when the offer includes client_max_window_bits", function() { with(this) {
      define("offer", { client_max_window_bits: true })

      it("includes client_max_window_bits in the response", function() { with(this) {
        assertEqual( { client_max_window_bits: 11 }, response() )
      }})

      it("uses context takeover and 11 window bits for inflating incoming messages", function() { with(this) {
        response()
        expect(zlib, "createInflateRaw").given({ windowBits: 11 }).exactly(1).returning(inflate)
        processIncomingMessage()
        processIncomingMessage()
      }})
    }})

    describe("when the offer has higher client_max_window_bits", function() { with(this) {
      define("offer", { client_max_window_bits: 12 })

      it("includes client_max_window_bits in the response", function() { with(this) {
        assertEqual( { client_max_window_bits: 11 }, response() )
      }})

      it("uses context takeover and 11 window bits for inflating incoming messages", function() { with(this) {
        response()
        expect(zlib, "createInflateRaw").given({ windowBits: 11 }).exactly(1).returning(inflate)
        processIncomingMessage()
        processIncomingMessage()
      }})
    }})

    describe("when the offer has lower client_max_window_bits", function() { with(this) {
      define("offer", { client_max_window_bits: 10 })

      it("includes client_max_window_bits in the response", function() { with(this) {
        assertEqual( { client_max_window_bits: 10 }, response() )
      }})

      it("uses context takeover and 10 window bits for inflating incoming messages", function() { with(this) {
        response()
        expect(zlib, "createInflateRaw").given({ windowBits: 10 }).exactly(1).returning(inflate)
        processIncomingMessage()
        processIncomingMessage()
      }})
    }})
  }})

  describe("with level", function() { with(this) {
    define("options", { level: _zlib.Z_BEST_SPEED })

    it("sets the level of the deflate stream", function() { with(this) {
      response()
      expect(zlib, "createDeflateRaw").given({ windowBits: 15, level: _zlib.Z_BEST_SPEED, memLevel: memLevel, strategy: strategy }).returns(deflate)
      processOutgoingMessage()
    }})
  }})

  describe("with memLevel", function() { with(this) {
    define("options", { memLevel: 5 })

    it("sets the memLevel of the deflate stream", function() { with(this) {
      response()
      expect(zlib, "createDeflateRaw").given({ windowBits: 15, level: _zlib.Z_DEFAULT_LEVEL, memLevel: 5, strategy: strategy }).returns(deflate)
      processOutgoingMessage()
    }})
  }})

  describe("with strategy", function() { with(this) {
    define("options", { strategy: _zlib.Z_FILTERED })

    it("sets the strategy of the deflate stream", function() { with(this) {
      response()
      expect(zlib, "createDeflateRaw").given({ windowBits: 15, level: _zlib.Z_DEFAULT_LEVEL, memLevel: memLevel, strategy: _zlib.Z_FILTERED }).returns(deflate)
      processOutgoingMessage()
    }})
  }})

  describe("with threshold", function() { with(this) {
    define("options", { threshold: 100 })
    
    it("does not compress messages smaller than threshold", function() { with(this) {
      this.message = { data: Buffer.alloc(50).fill("x"), rsv1: true }
      response()
      expect(zlib, "createDeflateRaw").exactly(0)
      processOutgoingMessage()
    }})

    it("compresses messages larger than threshold", function() { with(this) {
      this.message = { data: Buffer.alloc(150).fill("x"), rsv1: true }
      response()
      expect(zlib, "createDeflateRaw").given({ windowBits: 15, level: level, memLevel: memLevel, strategy: strategy }).returns(deflate)
      processOutgoingMessage()
    }})

    it("sets rsv1 to false when skipping compression", function() { with(this) {
      this.message = { data: Buffer.alloc(50).fill("x"), rsv1: true }
      response()
      processOutgoingMessage(function(error, message) {
        assertEqual(false, message.rsv1)
      })
    }})

    it("maintains rsv1 when compressing", function() { with(this) {
      this.message = { data: Buffer.alloc(150).fill("x"), rsv1: true }
      response()
      stub(zlib, "createDeflateRaw").returns(deflate)
      processOutgoingMessage(function(error, message) {
        assertEqual(true, message.rsv1)
      })
    }})

    it("handles threshold of 0 (always compress)", function() { with(this) {
      this.ext = PermessageDeflate.configure({ threshold: 0 })
      this.session = ext.configure({ zlib: zlib }).createServerSession([offer])
      this.message = { data: Buffer.alloc(1).fill("x"), rsv1: true }
      response()
      expect(zlib, "createDeflateRaw").given({ windowBits: 15, level: level, memLevel: memLevel, strategy: strategy }).returns(deflate)
      processOutgoingMessage()
    }})

    it("handles undefined threshold (always compress)", function() { with(this) {
      this.ext = PermessageDeflate.configure({})
      this.session = ext.configure({ zlib: zlib }).createServerSession([offer])
      this.message = { data: Buffer.alloc(1).fill("x"), rsv1: true }
      response()
      expect(zlib, "createDeflateRaw").given({ windowBits: 15, level: level, memLevel: memLevel, strategy: strategy }).returns(deflate)
      processOutgoingMessage()
    }})
  }})
}})
