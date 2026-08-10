const schema={
  type:'object',additionalProperties:false,
  properties:{
    meal_name:{type:'string'},
    items:{type:'array',items:{type:'object',additionalProperties:false,properties:{name:{type:'string'},estimated_amount:{type:'string'}},required:['name','estimated_amount']}},
    total_kcal:{type:'number'},protein_g:{type:'number'},fat_g:{type:'number'},carbs_g:{type:'number'},
    confidence:{type:'string',enum:['low','medium','high']},estimate_note:{type:'string'},meal_advice:{type:'string'}
  },
  required:['meal_name','items','total_kcal','protein_g','fat_g','carbs_g','confidence','estimate_note','meal_advice']
};
function outputText(data){for(const item of data.output||[]){if(item.type==='message')for(const c of item.content||[])if(c.type==='output_text'&&c.text)return c.text}return ''}
export default async function handler(req,res){
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 if(!process.env.OPENAI_API_KEY)return res.status(503).json({error:'OPENAI_API_KEY が設定されていません'});
 const {image,mealType,note,profile,today,training}=req.body||{};if(!image)return res.status(400).json({error:'画像がありません'});
 const prompt=`あなたは筋肥大を目的とした食事記録アプリの栄養推定アシスタントです。ユーザーは身長${profile?.height||172}cm、現在${profile?.currentWeight||68}kg、目標${profile?.targetWeight||69}kg。1日目安は${profile?.kcal||2500}kcal、P${profile?.p||130}g、F${profile?.f||60}g、C${profile?.c||330}gです。今日ここまで: ${Math.round(today?.kcal||0)}kcal、P${Math.round(today?.p||0)}g、F${Math.round(today?.f||0)}g、C${Math.round(today?.c||0)}g。今日は${training||'Rest'}。食事区分:${mealType||''}。ユーザー補足:${note||'なし'}。写真から料理・食材と量を推定し、カロリーとPFCを現実的な中心値で推定してください。見えない油・ソース・重量は断定せず、estimate_noteで不確実性を説明してください。meal_adviceはこの食事を今日の残り目標と筋肥大目的の観点から2文以内で具体的に。医療的な診断はしない。`;
 try{
  const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Authorization':`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-5.6',input:[{role:'user',content:[{type:'input_text',text:prompt},{type:'input_image',image_url:image,detail:'auto'}]}],text:{format:{type:'json_schema',name:'meal_analysis',strict:true,schema}}})});
  const data=await r.json();if(!r.ok)return res.status(r.status).json({error:data?.error?.message||'OpenAI API error'});const text=outputText(data);return res.status(200).json(JSON.parse(text));
 }catch(e){return res.status(500).json({error:'AI分析でエラーが発生しました'})}
}
