"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIStream = void 0;
const eventsource_parser_1 = require("eventsource-parser");
function OpenAIStream(payload) {
    return __awaiter(this, void 0, void 0, function* () {
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        let counter = 0;
        const apiURL = "https://api.openai.com";
        const res = yield fetch(apiURL + "/v1/chat/completions", {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer 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`,
            },
            method: "POST",
            body: JSON.stringify(payload),
        });
        const stream = new ReadableStream({
            start(controller) {
                var _a, e_1, _b, _c;
                return __awaiter(this, void 0, void 0, function* () {
                    // callback
                    function onParse(event) {
                        if (event.type === "event") {
                            const data = event.data;
                            if (data === "[DONE]") {
                                controller.close();
                                return;
                            }
                            try {
                                const json = JSON.parse(data);
                                // console.log("JSON.parse(data): ", json);
                                const content = json.choices[0].delta.content;
                                // console.log("content: ", content);
                                const queue = encoder.encode(content);
                                controller.enqueue(queue);
                                counter++;
                            }
                            catch (e) {
                                // maybe parse error
                                controller.error(e);
                            }
                        }
                    }
                    // stream response (SSE) from OpenAI may be fragmented into multiple chunks
                    // this ensures we properly read chunks and invoke an event for each SSE event stream
                    const parser = (0, eventsource_parser_1.createParser)(onParse);
                    try {
                        // https://web.dev/streams/#asynchronous-iteration
                        for (var _d = true, _e = __asyncValues(res.body), _f; _f = yield _e.next(), _a = _f.done, !_a;) {
                            _c = _f.value;
                            _d = false;
                            try {
                                const chunk = _c;
                                parser.feed(decoder.decode(chunk));
                            }
                            finally {
                                _d = true;
                            }
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (!_d && !_a && (_b = _e.return)) yield _b.call(_e);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                });
            },
        });
        return stream;
    });
}
exports.OpenAIStream = OpenAIStream;
//# sourceMappingURL=OpenAIStream.js.map