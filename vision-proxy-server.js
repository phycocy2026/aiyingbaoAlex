const http = require("http");
const https = require("https");

const PORT = Number(process.env.PORT || 8787);
const API_KEY = process.env.DASHSCOPE_API_KEY || process.env.AIYINGBAO_VISION_API_KEY;
const API_URL = process.env.AIYINGBAO_VISION_API_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
const MODEL = process.env.AIYINGBAO_VISION_MODEL || "qwen3-vl-plus";

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 12 * 1024 * 1024) req.destroy(new Error("请求体过大"));
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function postJson(url, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const target = new URL(url);
    const req = https.request(target, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body)
      },
      timeout: 60000
    }, (res) => {
      let raw = "";
      res.on("data", (chunk) => raw += chunk);
      res.on("end", () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`大模型接口 HTTP ${res.statusCode}: ${raw.slice(0, 200)}`));
          return;
        }
        try { resolve(JSON.parse(raw)); }
        catch { reject(new Error("大模型返回内容无法解析")); }
      });
    });
    req.on("timeout", () => req.destroy(new Error("大模型接口超时")));
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function parseModelContent(content) {
  const text = Array.isArray(content)
    ? content.map((item) => item.text || "").join("")
    : String(content || "");

  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try { return JSON.parse(cleaned); }
  catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("无法解析识别结果");
    return JSON.parse(match[0]);
  }
}

async function recognizeImage(payload) {
  if (!API_KEY) throw new Error("未配置 DASHSCOPE_API_KEY");

  const result = await postJson(API_URL, {
    model: MODEL,
    temperature: 0.1,
    max_tokens: 700,
    messages: [
      {
        role: "system",
        content: "你是健康营养管理软件中的AI图片识别助手。只根据图片中可见内容判断，不生成过度具体的菜名。优先输出粗粒度餐食类别和中文食材。"
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `请分析餐食图片并返回严格JSON，不要附加解释。

要求：
1. foodCategory 使用粗粒度类别，例如：牛肉类主食、鸡肉类主食、米饭类餐食、面食类、鱼虾类、蔬菜类、水果类、饮品类、混合餐食。
2. 不要生成“温泉蛋牛肉盖饭”“鸡胸藜麦碗”等具体菜单名称。
3. ingredients 只列图片中有视觉依据的主要食材，使用中文。
4. nutrition 是整份餐食的估算值，不代表精确检测。
5. top5 返回5个参考候选，name可使用模型原始标签或粗粒度类别，score为0-1之间的小数。

JSON格式：
{
  "foodCategory":"粗粒度类别",
  "ingredients":["食材1","食材2"],
  "nutrition":{"calories":0,"protein":0,"carbs":0,"fat":0},
  "confidence":0.0,
  "top5":[
    {"name":"候选1","score":0.0},
    {"name":"候选2","score":0.0},
    {"name":"候选3","score":0.0},
    {"name":"候选4","score":0.0},
    {"name":"候选5","score":0.0}
  ]
}`
          },
          { type: "image_url", image_url: { url: payload.imageDataUrl } }
        ]
      }
    ]
  });

  return parseModelContent(result.choices?.[0]?.message?.content);
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  });
  res.end(JSON.stringify(data));
}

http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }
  if (req.method === "GET" && req.url === "/") {
    sendJson(res, 200, {
      ok: true,
      service: "AI智营宝视觉识别",
      version: "4.0",
      model: MODEL
    });
    return;
  }
  if (req.method === "POST" && req.url === "/api/vision-recognition") {
    try {
      const payload = JSON.parse(await readBody(req));
      const result = await recognizeImage(payload);
      sendJson(res, 200, result);
    } catch (error) {
      console.error("视觉识别失败：", error.message);
      sendJson(res, 500, { error: error.message });
    }
    return;
  }
  sendJson(res, 404, { error: "Not Found" });
}).listen(PORT, () => {
  console.log(`AI智营宝 V4.0 API 已启动，端口 ${PORT}`);
});
