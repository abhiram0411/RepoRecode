import {evaluateComponent} from "../core/componentPractice";
self.onmessage=async e=>{try{self.postMessage({result:await evaluateComponent(e.data.files,e.data.symbol,e.data.code)});}catch(error){self.postMessage({error:String(error)});}};
