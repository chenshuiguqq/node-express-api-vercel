const { createClient } = require('@supabase/supabase-js')
const { OpenAIStream } = require('./dist/OpenAIStream.js')
const { Readable } = require('stream');
let portNum = 3000;
let isTest = false;

// 引入模块
const http_module = require('http');
const url_module = require('url');


/**
 * web服务
 */
const Koa = require('koa');
const koa = new Koa();
const Router = require('koa-router');
const router = new Router({});
const koaBody = require('koa-body');




/**
 * 调用外部接口异步
 */
const fetch = require('node-fetch');
/**
 * 异步请求初始化使用
 */
const request = require('sync-request');

/**
 * 定时调度器
 */
const schedule = require('node-schedule');

// koa.use(koaBody({}));
//koa.use(bodyParser());
koa.use(router.routes());

var port = process.env.PORT || portNum;

koa.listen(port);

console.info("Server listening on " + port);

const url = "https://enbntbcaestutdjyjkgj.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuYm50YmNhZXN0dXRkanlqa2dqIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODQxMzgwNjEsImV4cCI6MTk5OTcxNDA2MX0.GBowSSxyoi7MPOpl0pZJ8R0kT95W77gqmwt5ebq1AB0";

const supabaseClient = createClient(url, key);

router.get('/test', async (ctx, next) => {
    ctx.body = {
        msg: 'success',
        errno: 0
        };
});

router.get('/training', async (ctx, next) => {
    let text = ctx.query.text
    if(text != undefined) {
        const apiKey = "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"; //process.env.OPENAI_API_KEY;
        const apiURL = "https://api.openai.com"
        const handle = async () => {
        const embeddingResponse = await fetch(
            apiURL + "/v1/embeddings",
            {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                input: text,
                model: "text-embedding-ada-002"
            })
            }
        );
        // console.log("\nembeddingResponse: \n", embeddingResponse);
        const embeddingData = await embeddingResponse.json();
        const [{ embedding }] = embeddingData.data;
    
        console.log("embedding:" + embedding);
    
        // In production we should handle possible errors
        try {
            let res = await supabaseClient.from("documents").insert({
            content: text,
            embedding,
            url: ''
            });
        }
        catch (error) {
            console.error("error in supabase insert: " + error);
        }
        
        }
        
        handle();
        ctx.body = {
        msg: 'success',
        errno: 0
        };
    }else {
        ctx.body = {
            msg: 'error',
            errno: 400
        };
    }
});

function getUrlStr(param, url = '') {
    if (typeof param !== 'object') {
        return url;
    } else {
        let paramArr = Object.entries(param).map(entry => {
            if (entry[1] instanceof Array) {
                entry[1] = '[' + entry[1].toString() + ']'
            } else if (typeof entry[1] === 'object') {
                entry[1] = JSON.stringify(entry[1]);
            }
            return entry.join('=');
        });
        let paramStr = paramArr.join('&');
        let hashIndex = url.indexOf('#');
        let urlPrefix = url;
        let urlHash = '';
        if (hashIndex !== -1) {
            urlPrefix = url.slice(0, hashIndex);
            urlHash = url.slice(hashIndex);
        }

        if (paramStr) {
            if (urlPrefix && urlPrefix.indexOf('?') !== -1) {
                urlPrefix += '&' + paramStr;
            } else {
                urlPrefix += '?' + paramStr;
            }
        }
        return urlPrefix + urlHash;
    }
}



router.get('/fetchstream', async (ctx, next) => {
    let req = ctx.req;
    let res = ctx.res;
    const parsedUrl = url_module.parse(req.url, true);
    const text = parsedUrl.query.text;
    if (text == undefined || text.length == 0) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.write(`text not exist\n`);
        res.end();
        return 
    }
    
      const input = text;
      // console.log("input: ", input);
    
      const apiKey = "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"; ///process.env.OPENAI_API_KEY;
      
      const apiURL = "https://api.openai.com"; // process.env.OPENAI_PROXY == "" ? "https://api.openai.com" : process.env.OPENAI_PROXY;

    let embeddingResponse;
    try {
        embeddingResponse = await fetch(
            apiURL + "/v1/embeddings",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                input,
                model: "text-embedding-ada-002"
              })
            }
          );
        if (!embeddingResponse){
            ctx.body = {
                errmsg: 'errer',
                errno: 1
            };
            return
        }
        const embeddingData = await embeddingResponse.json();
    
        if(!embeddingData) {
        ctx.body = {
            errmsg: 'errer',
            errno: 2
        };
        return
        }
        const [{ embedding }] = embeddingData.data;
        // console.log("embedding: ", embedding);
    
        const { data: documents, error } = await supabaseClient.rpc(
        "match_documents",
        {
            query_embedding: embedding,
            similarity_threshold: 0.8, // Choose an appropriate threshold for your data
            match_count: 4 // Choose the number of matches
        }
        );
    
        if (error) console.error(error);
        
        //   const tokenizer = new GPT3Tokenizer({ type: "gpt3" });
          let tokenCount = 0;
          let contextText = "";
        
          // console.log("documents: ", documents);
            const len = documents.length;
          // Concat matched documents
          if (documents) {
            for (let i = 0; i < documents.length; i++) {
              const document = documents[i];
              const content = document.content;
              const url = document.url;
            //   const encoded = tokenizer.encode(content);
            //   tokenCount += encoded.text.length;
              console.log("index: ", i);
              console.log(content);
              console.log(url);
              // Limit context to max 1500 tokens (configurable)
              // if (tokenCount > 1500) {
              //   break;
              // }
        
              contextText += `${content.trim()}\nSOURCE: ${url}\n---\n`;
            }
          }
    
        const systemContent = `您是一个催收业务员，主要就是跟欠款人进行催促还款进行沟通。您只需按照CONTEXT里面的债务人与业务员的对话，结合CONTEXT里的建议以及业务员的内容进行回答，不要包含其它无关信息。并始终以markdown格式输出您的答案。`;//用严肃（输出用"话术1"）和客气（输出用"话术2"）两种态度给出两种回答，
        const userContent = ``// CONTEXT: ${contextText}`;
        const assistantContent = ``;
        const userMessage = `CONTEXT : ${contextText}
        USER QUESTION: ${input}`;
        const messages = [
            {
            role: "system",
            content: systemContent
            },
            {
            role: "user",
            content: userContent
            },
            {
            role: "assistant",
            content: assistantContent
            },
            {
            role: "user",
            content: userMessage
            }
        ];
        console.log("messages: ", messages);
    
        const payload = {
            model: "gpt-3.5-turbo-0301",
            messages: messages,
            temperature: 0.8,
            top_p: 0.3,
            frequency_penalty: 0,
            presence_penalty: 0,
            max_tokens: 2000,
            stream: true,
            n: 1
        };
    
        const stream = await OpenAIStream(payload);
        const reader = stream.getReader();
        const decoder = new TextDecoder();
        
    
        const OutPutStream = new Readable({
            read() {}
        });
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', 'attachment; filename="letters.txt"');
        
        let output = "";
        OutPutStream.pipe(res);
        let done = false;
        while (!done) {
            const { value, done: doneReading } = await reader.read();
            done = doneReading;
            const chunkValue = decoder.decode(value);
            OutPutStream.push(chunkValue);
            output = `${output}${chunkValue}`

            
            // document.getElementById('data-element').innerHTML = output;
            // 
            // console.info(`chunkValue: ${chunkValue}`);
        }
        ctx.body = {
            data: {
                ads: [
                    {
                        url: ""
                    }
                ]
            },
            errmsg: 'success',
            errno: 0
        };

        res.end();
    } catch (error) {
        ctx.body = {
            errmsg: 'errer',
            errno: 0
        };
        return 
    }
    ctx.body = {
        data: {
            ads: [
                {
                    url: ""
                }
            ]
        },
        errmsg: 'success',
        errno: 0
    };

    
        
    

});