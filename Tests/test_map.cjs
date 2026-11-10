const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'../Resources/Map');let active,marker,current;const posts=[],timers=[],events={};
const state={lat:31.2304,lng:121.4737,zoom:12};const rect={left:0,top:0,right:300,bottom:300};
const map={attributionControl:{setPrefix(){}},setView(p,z){state.lat=p[0];state.lng=p[1];state.zoom=z;events.moveend?.();return this},getCenter(){return{lat:state.lat,lng:state.lng}},getZoom(){return state.zoom},setMaxZoom(){},removeLayer(){},on(event,fn){events[event]=fn},getBounds(){return{getNorth:()=>state.lat+1,getSouth:()=>state.lat-1,getEast:()=>state.lng+1,getWest:()=>state.lng-1}},getContainer(){return{getBoundingClientRect:()=>rect}},project(){return{unscaleBy(){return{floor(){return{x:1,y:2}}}}}}};
function tile(){return{loaded:0,el:{naturalWidth:0,dataset:{},getBoundingClientRect:()=>rect}};}
function layer(url,options){return{url,options,_tileZoom:12,_tiles:{'1:2:12':tile()},getTileSize(){return{x:256,y:256}},handlers:{},on(e,fn){this.handlers[e]=fn;return this},addTo(){active=this;return this}}}
const context=vm.createContext({console,Number,Math,Set,Object,setTimeout:f=>timers.push(f),window:{webkit:{messageHandlers:{map:{postMessage:v=>posts.push(v)}}}},L:{map:()=>map,tileLayer:layer,divIcon:x=>x,marker:p=>({point:Array.from(p),addTo(){marker=this;return this}}),circleMarker:p=>({point:Array.from(p),addTo(){current=this;return this}})}});
context.window=context;context.webkit={messageHandlers:{map:{postMessage:v=>posts.push(v)}}};
for(const file of ['sources.js','mainland.js','gcj.js','map.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
const run=s=>vm.runInContext(s,context);const sources=JSON.parse(fs.readFileSync(path.join(root,'sources.json'),'utf8'));
assert.equal(sources.length,2);assert.equal(sources[0].id,'amap');assert(sources[0].url.includes('style=7&'));assert.equal(sources[1].url,'https://tile.openstreetmap.org/{z}/{x}/{y}.png');assert.equal(sources[1].gcj,false);assert(sources[1].attribution.includes('OpenStreetMap contributors'));
assert.deepEqual(JSON.parse(JSON.stringify(run('MAP_SOURCES'))),sources);
for(const [lat,lon] of [[31.2304,121.4737],[39.9,116.4],[22.54,114.06],[19.2,109.5]])assert(run(`isMainlandPoint(${lat},${lon})`));
for(const [lat,lon] of [[37.56,126.98],[21.028,105.834],[25.03,121.56],[35.68,139.69],[40.7,-74],[-33.86,151.2],[51.5,-.12],[1.35,103.8]]){assert(!run(`isMainlandPoint(${lat},${lon})`));const g=run(`wgs84ToGcj02(${lat},${lon})`);assert.equal(g.lat,lat);assert.equal(g.lon,lon);}
function load(){const t=active._tiles['1:2:12'];t.loaded=1;t.el.naturalWidth=256;active.handlers.tileload({tile:t.el});}
run('setPoint(31.2304,121.4737,true)');assert.equal(run('source'),0);const d=run('wgs84ToGcj02(31.2304,121.4737)');assert(Math.abs(marker.point[0]-d.lat)<1e-9);load();events.click({latlng:{lat:d.lat,lng:d.lon}});let pick=posts.filter(p=>p.type==='pick').at(-1);assert(Math.abs(pick.latitude-31.2304)<1e-8);
run('setPoint(40.7,-74,true)');assert.equal(run('source'),1);assert.deepEqual(marker.point,[40.7,-74]);load();events.click({latlng:{lat:40.7,lng:-74}});pick=posts.filter(p=>p.type==='pick').at(-1);assert.equal(pick.longitude,-74);
const base=JSON.stringify(run('selectedWGS'));run('showCurrentLocation(-33.86,151.2,20)');assert.equal(run('source'),1);assert.deepEqual(current.point,[-33.86,151.2]);assert.equal(JSON.stringify(run('selectedWGS')),base);
run("setMapMode('amap')");assert.equal(run('source'),0);assert.deepEqual(marker.point,[40.7,-74]);run('setPoint(51.5,-.12,true)');assert.equal(run('source'),0,'manual choice stays');
run("setMapMode('auto')");assert.equal(run('source'),1);run('setPoint(31.2304,121.4737,true)');assert.equal(run('source'),0);
run("setMapMode('osm')");assert.deepEqual(marker.point,[31.2304,121.4737],'global map uses WGS even for mainland');const chosen=JSON.stringify(run('selectedWGS'));run('retryMap()');assert.equal(run('mode'),'osm');assert.equal(JSON.stringify(run('selectedWGS')),chosen);
load();const old=active,oldTile=old._tiles['1:2:12'];run('retryMap()');old.handlers.tileerror({tile:oldTile.el});assert.equal(run('errors'),0,'stale source errors ignored');
load();const failed=tile();failed.el.dataset.wlocFailed='1';active._tiles.failed=failed;run('reportViewport()');assert(posts.at(-1).message.includes('部分'));
// Loaded tiles outside the current viewport cannot hide current failures.
active._tiles['1:2:12'].el.getBoundingClientRect=()=>({left:400,top:0,right:500,bottom:100});run('reportViewport()');assert.equal(run('loaded'),0);assert.equal(posts.at(-1).visible,false);
const count=posts.filter(p=>p.type==='pick').length;active._tiles={};events.click({latlng:{lat:31.2,lng:121.4}});assert.equal(posts.filter(p=>p.type==='pick').length,count);
run("setMapMode('auto')");state.lat=40.7;state.lng=-74;events.moveend();assert.equal(run('source'),1,'panning overseas chooses global');assert(posts.some(p=>p.type==='viewport'&&Math.abs(p.longitude+74)<1e-8));
const before=JSON.stringify(state);run('showCurrentLocation(91,0,5)');assert.equal(JSON.stringify(state),before);
console.log('PASS: mainland routing/neighbor exclusions, manual modes, global WGS pick, markers, viewport search hints, partial failures, offscreen/stale tiles, unloaded picks and retry');
