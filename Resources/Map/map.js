'use strict';
const map=L.map('map',{zoomControl:true,minZoom:2,maxZoom:19,worldCopyJump:true}).setView([31.2304,121.4737],12);
map.attributionControl.setPrefix('');
let layer,marker,currentMarker,source=0,mode='auto',epoch=0,viewportEpoch=0,loaded=0,errors=0,selectedWGS=null,currentWGS=null,changingSource=false;
const post=v=>window.webkit.messageHandlers.map.postMessage(v);
const notify=(message,visible)=>post({type:'tiles',message,visible,source});
const normalizeLon=lon=>((lon+180)%360+360)%360-180;
const valid=(lat,lon)=>Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=90&&Math.abs(lon)<=180;
const toDisplay=(lat,lon,index=source)=>MAP_SOURCES[index].gcj?wgs84ToGcj02(lat,lon):{lat,lon};
const fromDisplay=(lat,lon,index=source)=>MAP_SOURCES[index].gcj?gcj02ToWgs84(lat,lon):{lat,lon};
const preferred=(lat,lon)=>mode==='auto'?(isMainlandPoint(lat,lon)?0:1):(mode==='amap'?0:1);
function renderMarker(){if(!selectedWGS)return;const d=toDisplay(selectedWGS.lat,selectedWGS.lon);if(marker)map.removeLayer(marker);marker=L.marker([d.lat,d.lon],{icon:L.divIcon({className:'',html:'<div class="pin"></div>',iconSize:[28,28],iconAnchor:[14,28]})}).addTo(map);}
function renderCurrent(){if(!currentWGS)return;const d=toDisplay(currentWGS.lat,currentWGS.lon);if(currentMarker)map.removeLayer(currentMarker);currentMarker=L.circleMarker([d.lat,d.lon],{radius:8,color:'#fff',weight:3,fillColor:'#1689ff',fillOpacity:1}).addTo(map);}
function viewportStats(){
 loaded=0;errors=0;if(!layer)return;
 const box=map.getContainer().getBoundingClientRect();
 for(const tile of Object.values(layer._tiles||{})){
  if(!tile.el)continue;const r=tile.el.getBoundingClientRect();
  if(r.right<=box.left||r.left>=box.right||r.bottom<=box.top||r.top>=box.bottom)continue;
  if(tile.loaded&&tile.el.naturalWidth>0)loaded++;
  else if(tile.el.dataset.wlocFailed==='1')errors++;
 }
}
function reportViewport(timedOut=false){
 viewportStats();const name=MAP_SOURCES[source].name;
 if(loaded&&errors)notify(name+' 部分图块加载失败；可重试或切换图源。',true);
 else if(loaded)notify(name+' 已显示，点击选位置',true);
 else if(errors)notify(name+' 当前区域图块请求失败；请重试或切换图源。',false);
 else notify(name+(timedOut?' 当前区域仍未返回地图；可重试或切换图源。':' 当前区域加载中…'),false);
}
function watchViewport(){
 const generation=epoch,view=++viewportEpoch;reportViewport();
 setTimeout(()=>{if(generation===epoch&&view===viewportEpoch)reportViewport(true);},12000);
}
function emitViewport(){
 const c=map.getCenter(),w=fromDisplay(c.lat,normalizeLon(c.lng)),bounds=map.getBounds();
 post({type:'viewport',latitude:w.lat,longitude:w.lon,latitudeDelta:Math.min(180,Math.abs(bounds.getNorth()-bounds.getSouth())),longitudeDelta:Math.min(360,Math.abs(bounds.getEast()-bounds.getWest()))});
}
function installSource(index,center){
 changingSource=true;source=index;const generation=++epoch,config=MAP_SOURCES[index];loaded=0;errors=0;
 if(layer)map.removeLayer(layer);
 const d=toDisplay(center.lat,center.lon);map.setMaxZoom(config.maxZoom);map.setView([d.lat,d.lon],Math.min(map.getZoom(),config.maxZoom));
 renderMarker();renderCurrent();
 layer=L.tileLayer('wloc-tile://'+config.id+'/{z}/{x}/{y}',{maxZoom:config.maxZoom,keepBuffer:0,updateWhenIdle:true,attribution:config.attribution});
 layer.on('tileload',e=>{if(generation!==epoch)return;delete e.tile.dataset.wlocFailed;reportViewport();});
 layer.on('tileerror',e=>{if(generation!==epoch)return;e.tile.dataset.wlocFailed='1';reportViewport();});
 layer.on('loading',()=>{if(generation===epoch)watchViewport();});
 layer.addTo(map);changingSource=false;emitViewport();watchViewport();
}
window.setMapMode=function(value){if(!['auto','amap','osm'].includes(value))return;const c=map.getCenter(),w=fromDisplay(c.lat,normalizeLon(c.lng));mode=value;installSource(preferred(w.lat,w.lon),w);};
window.setSource=function(index){if(MAP_SOURCES[index])setMapMode(MAP_SOURCES[index].id);};
window.retryMap=function(){const c=map.getCenter();installSource(source,fromDisplay(c.lat,normalizeLon(c.lng)));};
function centerOn(lat,lon,zoom){const next=preferred(lat,lon);if(next!==source)installSource(next,{lat,lon});const d=toDisplay(lat,lon);map.setView([d.lat,d.lon],Math.min(zoom,MAP_SOURCES[source].maxZoom));emitViewport();watchViewport();}
window.setPoint=function(lat,lon,selected){if(!valid(lat,lon))return;if(selected)selectedWGS={lat,lon};centerOn(lat,lon,Math.max(map.getZoom(),12));if(selected)renderMarker();};
window.showCurrentLocation=function(lat,lon,accuracy){if(!valid(lat,lon)||!Number.isFinite(accuracy)||accuracy<0)return;currentWGS={lat,lon,accuracy};centerOn(lat,lon,accuracy>2000?12:16);renderCurrent();};
map.on('moveend',()=>{if(changingSource)return;const c=map.getCenter(),w=fromDisplay(c.lat,normalizeLon(c.lng)),next=preferred(w.lat,w.lon);if(next!==source){installSource(next,w);return;}emitViewport();watchViewport();});
map.on('click',e=>{
 if(!layer)return;const z=layer._tileZoom;if(!Number.isInteger(z))return;
 const p=map.project(e.latlng,z).unscaleBy(layer.getTileSize()).floor();p.x=((p.x%(2**z))+(2**z))%(2**z);
 const tile=layer._tiles[p.x+':'+p.y+':'+z];
 if(!tile||!tile.loaded||!tile.el.naturalWidth||tile.el.dataset.wlocFailed==='1'){notify('点击区域尚未加载出地图，请重试或切换图源。',false);return;}
 const w=fromDisplay(e.latlng.lat,normalizeLon(e.latlng.lng));setPoint(w.lat,w.lon,true);post({type:'pick',latitude:w.lat,longitude:w.lon});
});
const initial={lat:31.2304,lon:121.4737};installSource(preferred(initial.lat,initial.lon),initial);
