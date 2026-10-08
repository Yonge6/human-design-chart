// Return text segments only: model output is never interpreted as HTML.
export function messageSegments(content) {
  return String(content).split('**').map((text,index)=>({text,bold:index%2===1})).filter(part=>part.text);
}
export function renderAssistantText(element, content) {
  element.replaceChildren();
  for(const part of messageSegments(content)) {
    if(part.bold){const strong=element.ownerDocument.createElement('strong');strong.textContent=part.text;element.append(strong);}
    else element.append(element.ownerDocument.createTextNode(part.text));
  }
}

// Display-only paragraphing: keep saved wording and never interpret model HTML.
export function readingParagraphs(content) {
  const text=String(content).replace(/\r\n?/g,'\n').replace(/\*\*([^*\n]+)\*\*/g,(whole,label,offset)=>(offset>0&&label.length<=45?'\n\n':'')+whole);
  return text.split(/\n+/).flatMap(block=>{
    if(block.trim().length<220)return block.trim()?[block.trim()]:[];
    const sentences=block.match(/[^。！？.!?]+(?:[。！？.!?]+[”’"']?|$)/g)||[block];
    const paragraphs=[];let current='';
    for(const sentence of sentences){current+=sentence;if(current.length>=140){paragraphs.push(current.trim());current='';}}
    if(current.trim())paragraphs.push(current.trim());return paragraphs;
  });
}
export function renderReadingText(element,content){
  element.replaceChildren();
  for(const text of readingParagraphs(content)){
    const p=element.ownerDocument.createElement('p');
    for(const part of readingSegments(text)){
      if(part.bold){const strong=element.ownerDocument.createElement('strong');strong.textContent=part.text;p.append(strong);}
      else p.append(element.ownerDocument.createTextNode(part.text));
    }
    element.append(p);
  }
}
export function readingSegments(text){
  const label=String(text).match(/^([^*\n：:。！？!?，,；;]{2,24}[：:])/u)?.[1];
  return label?[{text:label,bold:true},...messageSegments(String(text).slice(label.length))]:messageSegments(text);
}
