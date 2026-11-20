// Opt-in diagnostics for repeatable local performance checks (?profile=1).
export const renderProfiler={
  enabled:typeof location!=='undefined'&&new URLSearchParams(location.search).get('profile')==='1',
  samples:new Map(),
  begin(){return this.enabled?performance.now():0;},
  end(name,start){
    if(!this.enabled)return;
    let sample=this.samples.get(name);
    if(!sample)this.samples.set(name,sample={total:0,count:0,max:0});
    const duration=performance.now()-start;
    sample.total+=duration;sample.count++;sample.max=Math.max(sample.max,duration);
  },
  snapshot(){
    const result={};
    for(const [name,value] of this.samples)result[name]={mean:+(value.total/value.count).toFixed(3),max:+value.max.toFixed(3),calls:value.count};
    this.samples.clear();return result;
  },
};
