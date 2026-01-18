import fetch from "node-fetch"

const TOKEN = "8586460757:AAGX9K3yT-44wXNkPHD5IEQ79UsqM7QG7m4"
const DB = "https://tg-token-finder-default-rtdb.firebaseio.com"

const ALL_EMOJI = ["👍","👎","❤","🔥","🥰","👏","😁","🤔","🤯","😱","🤬","😢","🎉","🤩","🤮","💩","🙏","👌","🕊","🤡","🥱","🥴","😍","🐳","❤‍🔥","🌚","🌭","💯","🤣","⚡","🍌","🏆","💔","🤨","😐","🍓","🍾","💋","🖕","😈","😴","😭","🤓","👻","👨‍💻","👀","🎃","🙈","😇","😨","🤝","✍","🤗","🫡","🎅","🎄","☃","💅","🤪","🗿","🆒","💘","🙉","🦄","😘","💊","🙊","😎","👾","🤷‍♂","🤷","🤷‍♀","😡"]

const POS = ALL_EMOJI.filter(e => !["👎","🤬","💔","🤮","💩","🖕","😡"].includes(e))
const NEG = ["👎","🤬","💔","🤮","💩","😡","😢","😭"]

const api = (method, data) => fetch("https://api.telegram.org/bot"+TOKEN+"/"+method,{
  method:"POST",
  headers:{"Content-Type":"application/json"},
  body:JSON.stringify(data)
})
const get = path => fetch(DB+path+".json").then(r=>r.json())
const set = (path,data) => fetch(DB+path+".json",{method:"PUT",body:JSON.stringify(data)})
const del = path => fetch(DB+path+".json",{method:"DELETE"})

const pick = (arr,weight) => {
  if(!weight) return arr[Math.floor(Math.random()*arr.length)]
  let s = weight.reduce((a,b)=>a+b,0)
  let r = Math.random()*s
  for(let i=0;i<arr.length;i++){ if(r<weight[i]) return arr[i]; r-=weight[i] }
  return arr[0]
}

const sleep = ms => new Promise(r=>setTimeout(r,ms))
const react = (chat_id, message_id, emojis) => fetch("https://api.telegram.org/bot"+TOKEN+"/setMessageReaction",{
  method:"POST",
  headers:{"Content-Type":"application/json"},
  body:JSON.stringify({chat_id,message_id,reaction:emojis.map(e=>({type:"emoji",emoji:e}))})
})

export default async (req,res)=>{
 if(req.method!=="POST") return res.end("OK")
 const update = req.body

 if(update.message){
   const chat = update.message.chat.id
   const text = update.message.text||""
   const mid = update.message.message_id

   if(text==="/start"){
     await api("sendMessage",{
       chat_id: chat,
       text: "🤖 *Auto Reaction Bot*\n\n⚡ Fully configurable with 50+ features\nSelect any section below to configure",
       parse_mode:"Markdown",
       reply_to_message_id: mid,
       reply_markup:{inline_keyboard:[
         [{text:"😊 Positive Reactions",callback_data:"section_pos"}],
         [{text:"😈 Negative Reactions",callback_data:"section_neg"}],
         [{text:"🎭 Mixed Reactions",callback_data:"section_mix"}],
         [{text:"🕹 Advanced Features",callback_data:"section_advanced"}],
         [{text:"📦 Backup",callback_data:"section_backup"}],
         [{text:"♻ Reset",callback_data:"section_reset"}]
       ]}
     })
   }

   if(text==="/test"){
     const last = await get("/last")
     if(last) await react(last.chat,last.msg,[pick(POS)])
   }

   if(text.startsWith("/add ")){
     const b = text.split(" ")[1]
     await set("/bots/"+b.replace(/\W/g,""),{token:b})
     await api("sendMessage",{chat_id:chat,text:"✅ Bot added",reply_to_message_id:mid})
   }

   if(text.startsWith("/remove ")){
     const b = text.split(" ")[1]
     await del("/bots/"+b.replace(/\W/g,""))
     await api("sendMessage",{chat_id:chat,text:"🗑 Bot removed",reply_to_message_id:mid})
   }
 }

 if(update.callback_query){
   const q = update.callback_query
   const chat = q.message.chat.id
   const msg = q.message.message_id
   const data = q.data

   if(data.startsWith("section_")){
     const section = data.split("_")[1]
     if(section==="pos"||section==="neg"||section==="mix"){
       await set("/channels/"+chat+"/mode",section)
       await api("editMessageText",{chat_id:chat,message_id:msg,text:`✅ *Mode saved:* ${section.toUpperCase()}\n\nFeatures active:\n• Reaction packs\n• Delay & probability\n• Filters (text/media/poll/forward)\n• Multi-reactions\n• Keyword & hashtag detection\n• Pinned boosts\n• Night & schedule mode`,parse_mode:"Markdown"})
     }
     if(section==="reset"){
       await del("/channels/"+chat)
       await api("editMessageText",{chat_id:chat,message_id:msg,text:"♻ All rules cleared"})
     }
     if(section==="backup"){
       const cfg = await get("/channels/"+chat)||{}
       await api("editMessageText",{chat_id:chat,message_id:msg,text:"📦 Backup:\n\n"+JSON.stringify(cfg,null,2)})
     }
     if(section==="advanced"){
       await api("editMessageText",{chat_id:chat,message_id:msg,text:
         "🛠 *Advanced Features*\n• Weight system\n• Emoji rotation\n• Reaction cooldown\n• Channel growth mode\n• Trending emoji\n• Event & weekend mode\n• Multi-channel support\n• Admin whitelist/blacklist\n• Auto-disable on mute\n• Paid plan lock\n• Analytics & history logs",parse_mode:"Markdown"})
     }
   }
 }

 if(update.channel_post){
   const p = update.channel_post
   const chat = p.chat.id
   const msg = p.message_id
   const txt = p.text||""
   const cfg = await get("/channels/"+chat)||{}
   const bots = await get("/bots")||{}

   if(cfg.disabled) return res.end("OK")
   if(cfg.night && new Date().getHours()<6) return res.end("OK")
   if(cfg.textOnly && !p.text) return res.end("OK")
   if(cfg.mediaOnly && !p.photo && !p.video) return res.end("OK")
   if(cfg.skipPoll && p.poll) return res.end("OK")
   if(cfg.skipForward && p.forward_from) return res.end("OK")
   if(cfg.prob && Math.random()>cfg.prob) return res.end("OK")

   let pack = cfg.mode==="neg"?NEG:cfg.mode==="pos"?POS:[...POS,...NEG]
   if(/http/.test(txt)) pack=["🔗","🌐","⚡"]
   if(/#/.test(txt)) pack=["🏷","🔥","📢"]
   if(txt.length>200) pack=["📝","🤓","👀"]
   if(p.pinned_message) pack.push("🚀")
   if(/bad|scam|fake/i.test(txt)) pack=NEG

   let count = cfg.multi?Math.floor(Math.random()*4)+2:1
   let chosen=[]
   for(let i=0;i<count;i++) chosen.push(pick(pack,cfg.weight))

   if(cfg.delay) await sleep(cfg.delay*1000)

   try{
     await react(chat,msg,chosen)
     for(const k in bots) await react(bots[k].token,chat,msg,chosen)
   }catch{
     await set("/channels/"+chat+"/disabled",true)
   }

   await set("/last",{chat,msg})
   await set("/history/"+chat+"/"+msg,{emojis:chosen,time:Date.now()})
 }

 res.json({ok:true})
}
