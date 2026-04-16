import React, { useRef, useCallback, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import WebView from "react-native-webview";
import type { WebViewMessageEvent } from "react-native-webview";
import { useQuery } from "@tanstack/react-query";
import { ref as dbRef, get } from "firebase/database";
import { database } from "@/config/firebase";
import { Box, RotateCcw } from "lucide-react-native";

interface Park {
  id: string;
  name: string;
  lotWidthFt?: number;
  lotHeightFt?: number;
  createdAt?: number;
}

interface TrackSegment {
  id: string;
  parkId: string;
  segmentType: "straight" | "curve";
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  controlX?: number;
  controlY?: number;
  elevation?: number;
  elevationEnd?: number;
  trackWidth?: number;
  turnName?: string;
}

interface ParkItem {
  id: string;
  parkId: string;
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  color?: string;
}

interface RacingLinePoint {
  x: number;
  y: number;
}

interface RacingLine {
  id: string;
  parkId: string;
  name?: string;
  driverName?: string;
  vehicleInfo?: string;
  color?: string;
  points: RacingLinePoint[];
  visible?: boolean;
  closed?: boolean;
}

const TRACK_3D_HTML = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;background:#080808;overflow:hidden}
canvas{display:block;touch-action:none;position:fixed;top:0;left:0}
#ui{position:fixed;bottom:0;left:0;right:0;padding:8px 10px 12px;background:linear-gradient(transparent,rgba(0,0,0,0.92));display:flex;flex-wrap:wrap;gap:5px;pointer-events:none}
.leg{display:inline-flex;align-items:center;gap:5px;padding:4px 9px;background:rgba(0,0,0,0.78);border:1px solid #1e1e1e;border-radius:5px;cursor:pointer;pointer-events:auto;touch-action:manipulation}
.ld{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.ll{color:#555;font:10px/1.2 -apple-system,monospace;white-space:nowrap}
.leg.on .ll{color:#ccc}
#pname{position:fixed;top:10px;left:10px;padding:5px 11px;background:rgba(8,8,8,0.92);border:1px solid #1a1a1a;border-radius:6px;color:#fff;font:700 10px/1 -apple-system,monospace;letter-spacing:2px;text-transform:uppercase;display:none}
#hint{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);color:#222;font:11px/2 -apple-system,monospace;letter-spacing:2px;text-align:center;pointer-events:none}
</style>
</head>
<body>
<canvas id="c"></canvas>
<div id="pname"></div>
<div id="ui"></div>
<div id="hint">AWAITING DATA</div>
<script>
var canvas=document.getElementById('c');
var W=window.innerWidth,H=window.innerHeight;
canvas.width=W;canvas.height=H;
var ctx=canvas.getContext('2d');
var cam={theta:0.6,phi:1.0,r:260,tx:0,ty:0,tz:0};
function computeView(){
  var sp=Math.sin(cam.phi),cp=Math.cos(cam.phi),st=Math.sin(cam.theta),ct=Math.cos(cam.theta);
  var ex=cam.tx+cam.r*sp*ct,ey=cam.ty+cam.r*cp,ez=cam.tz+cam.r*sp*st;
  var fdx=cam.tx-ex,fdy=cam.ty-ey,fdz=cam.tz-ez;
  var fl=Math.sqrt(fdx*fdx+fdy*fdy+fdz*fdz)||1;
  fdx/=fl;fdy/=fl;fdz/=fl;
  var rx=fdy*0-fdz*1,ry=fdz*0-fdx*0,rz=fdx*1-fdy*0;
  var rl=Math.sqrt(rx*rx+ry*ry+rz*rz)||1;
  rx/=rl;ry/=rl;rz/=rl;
  var ux=ry*fdz-rz*fdy,uy=rz*fdx-rx*fdz,uz=rx*fdy-ry*fdx;
  return [rx,ry,rz,-(rx*ex+ry*ey+rz*ez),ux,uy,uz,-(ux*ex+uy*ey+uz*ez),-fdx,-fdy,-fdz,-(-fdx*ex-fdy*ey-fdz*ez)];
}
var view=computeView();
function project(wx,wy,wz){
  var v=view;
  var cx=v[0]*wx+v[1]*wy+v[2]*wz+v[3];
  var cy=v[4]*wx+v[5]*wy+v[6]*wz+v[7];
  var cz=v[8]*wx+v[9]*wy+v[10]*wz+v[11];
  if(cz<=0.5)return null;
  var f=W*0.5/Math.tan(55*Math.PI/360);
  return [W*0.5+cx/cz*f,H*0.5-cy/cz*f,cz];
}
function toW(fx,fy,fe){return[fx-147.5,fe||0,fy-147.5];}
function hsl2hex(str){
  if(!str)return '#ff4444';
  if(str.charAt(0)==='#')return str;
  var m=str.match(/hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%/);
  if(!m)return '#ff4444';
  var h=parseFloat(m[1])/360,s=parseFloat(m[2])/100,l=parseFloat(m[3])/100;
  var q=l<0.5?l*(1+s):l+s-l*s,p=2*l-q;
  function hue(p,q,t){t=(t%1+1)%1;if(t<1/6)return p+(q-p)*6*t;if(t<0.5)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p;}
  var r=Math.round(hue(p,q,h+1/3)*255),g=Math.round(hue(p,q,h)*255),b=Math.round(hue(p,q,h-1/3)*255);
  return '#'+(r<16?'0':'')+r.toString(16)+(g<16?'0':'')+g.toString(16)+(b<16?'0':'')+b.toString(16);
}
function bezier3(p0,c,p1,n){
  var pts=[];
  for(var i=0;i<=n;i++){var t=i/n,u=1-t;pts.push([u*u*p0[0]+2*u*t*c[0]+t*t*p1[0],u*u*p0[1]+2*u*t*c[1]+t*t*p1[1],u*u*p0[2]+2*u*t*c[2]+t*t*p1[2]]);}
  return pts;
}
var trackQuads=[],trackDashes=[],facilityBoxes=[],racingLines={};
var ICOLORS={'paddock':'#f59e0b','start-finish':'#ef4444','marshall-post':'#f97316','emergency-unit':'#ef4444','medical-center':'#ec4899','pit-lane':'#3b82f6','spectator-area':'#22c55e','timing-tower':'#a855f7','fuel-station':'#eab308','tech-inspection':'#6366f1','entrance-gate':'#14b8a6','parking-lot':'#64748b','restroom':'#94a3b8','control-room':'#06b6d4','barrier-wall':'#e2e8f0','tire-wall':'#334155','gravel-trap':'#d97706','custom-item':'#8b5cf6'};
function buildSurface(pts,hw){
  var quads=[];
  for(var i=0;i<pts.length-1;i++){
    var a=pts[i],b=pts[i+1];
    var dx=b[0]-a[0],dz=b[2]-a[2];
    var len=Math.sqrt(dx*dx+dz*dz)||1;
    var rx=-dz/len*hw,rz=dx/len*hw;
    quads.push([[a[0]-rx,a[1]+0.1,a[2]-rz],[a[0]+rx,a[1]+0.1,a[2]+rz],[b[0]+rx,b[1]+0.1,b[2]+rz],[b[0]-rx,b[1]+0.1,b[2]-rz]]);
  }
  return quads;
}
function buildScene(data){
  trackQuads=[];trackDashes=[];facilityBoxes=[];racingLines={};
  (data.segments||[]).forEach(function(seg){
    var hw=(seg.trackWidth||8)/2;
    var s=toW(seg.startX,seg.startY,seg.elevation||0);
    var e=toW(seg.endX,seg.endY,seg.elevationEnd||0);
    var pts;
    if(seg.segmentType==='curve'&&seg.controlX!=null){
      var c=toW(seg.controlX,seg.controlY,((seg.elevation||0)+(seg.elevationEnd||0))/2);
      pts=bezier3(s,c,e,44);
    }else{pts=[s,e];}
    var quads=buildSurface(pts,hw);
    for(var q=0;q<quads.length;q++)trackQuads.push(quads[q]);
    trackDashes.push(pts);
  });
  (data.items||[]).forEach(function(item){
    var pos=toW(item.x||0,item.y||0,0);
    var hw=Math.max((item.width||10),2)/2;
    var hd=Math.max((item.height||10),2)/2;
    var rot=((item.rotation||0)*Math.PI/180);
    facilityBoxes.push({pos:pos,hw:hw,hd:hd,H:3.5,color:ICOLORS[item.type]||'#888',rot:rot});
  });
  (data.racingLines||[]).forEach(function(line){
    if(!line.points||line.points.length<2)return;
    var pts=line.points.map(function(p){return toW(p.x,p.y,0.35);});
    if(line.closed&&pts.length>1)pts.push(pts[0].slice());
    racingLines[line.id]={id:line.id,color:hsl2hex(line.color||'#ff4444'),pts:pts,visible:line.visible!==false,label:(line.driverName||line.name||'Line')+(line.vehicleInfo?' \u00b7 '+line.vehicleInfo:'')};
  });
  buildLegend();
}
function buildLegend(){
  var ui=document.getElementById('ui');
  ui.innerHTML='';
  var keys=Object.keys(racingLines);
  for(var i=0;i<keys.length;i++){
    (function(rl){
      var div=document.createElement('div');
      div.className='leg'+(rl.visible?' on':'');
      var dot=document.createElement('span');dot.className='ld';dot.style.background=rl.color;
      var lbl=document.createElement('span');lbl.className='ll';lbl.textContent=rl.label;
      div.appendChild(dot);div.appendChild(lbl);
      div.addEventListener('click',function(){rl.visible=!rl.visible;div.classList.toggle('on',rl.visible);});
      ui.appendChild(div);
    })(racingLines[keys[i]]);
  }
}
function drawGrid(){
  ctx.strokeStyle='#141414';ctx.lineWidth=0.5;
  var step=295/15;
  for(var i=0;i<=15;i++){
    var v=i*step-147.5;
    var a=project(v,0,-147.5),b=project(v,0,147.5);
    if(a&&b){ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();}
    var c=project(-147.5,0,v),d=project(147.5,0,v);
    if(c&&d){ctx.beginPath();ctx.moveTo(c[0],c[1]);ctx.lineTo(d[0],d[1]);ctx.stroke();}
  }
  var corn=[[-147.5,0,-147.5],[147.5,0,-147.5],[147.5,0,147.5],[-147.5,0,147.5]];
  var ps=corn.map(function(c){return project(c[0],c[1],c[2]);});
  if(ps.every(Boolean)){
    ctx.beginPath();ctx.moveTo(ps[0][0],ps[0][1]);
    for(var j=1;j<ps.length;j++)ctx.lineTo(ps[j][0],ps[j][1]);
    ctx.closePath();ctx.strokeStyle='#2a2a2a';ctx.lineWidth=1;ctx.stroke();
  }
}
function drawBox(box){
  var px=box.pos[0],pz=box.pos[2];
  var hw=box.hw,hd=box.hd,BH=box.H,color=box.color;
  var cr=Math.cos(box.rot),sr=Math.sin(box.rot);
  var corners=[[-hw,-hd],[hw,-hd],[hw,hd],[-hw,hd]].map(function(c){return[px+c[0]*cr-c[1]*sr,pz+c[0]*sr+c[1]*cr];});
  var bot=corners.map(function(c){return project(c[0],0,c[1]);});
  var top=corners.map(function(c){return project(c[0],BH,c[1]);});
  if(!bot.every(Boolean)||!top.every(Boolean))return;
  for(var i=0;i<4;i++){
    var ni=(i+1)%4;
    ctx.beginPath();
    ctx.moveTo(bot[i][0],bot[i][1]);ctx.lineTo(bot[ni][0],bot[ni][1]);
    ctx.lineTo(top[ni][0],top[ni][1]);ctx.lineTo(top[i][0],top[i][1]);
    ctx.closePath();ctx.fillStyle=color+'55';ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(top[0][0],top[0][1]);
  for(var i=1;i<top.length;i++)ctx.lineTo(top[i][0],top[i][1]);
  ctx.closePath();ctx.fillStyle=color+'cc';ctx.fill();
  ctx.strokeStyle=color;ctx.lineWidth=1;ctx.stroke();
}
function drawScene(){
  ctx.fillStyle='#080808';ctx.fillRect(0,0,W,H);
  drawGrid();
  var pqs=[];
  for(var i=0;i<trackQuads.length;i++){
    var q=trackQuads[i];var ps=[],valid=true;
    for(var j=0;j<4;j++){var p=project(q[j][0],q[j][1],q[j][2]);if(!p){valid=false;break;}ps.push(p);}
    if(!valid)continue;
    var avgZ=(ps[0][2]+ps[1][2]+ps[2][2]+ps[3][2])/4;
    pqs.push({ps:ps,z:avgZ});
  }
  pqs.sort(function(a,b){return b.z-a.z;});
  for(var i=0;i<pqs.length;i++){
    var ps=pqs[i].ps;
    ctx.beginPath();ctx.moveTo(ps[0][0],ps[0][1]);
    for(var j=1;j<ps.length;j++)ctx.lineTo(ps[j][0],ps[j][1]);
    ctx.closePath();ctx.fillStyle='#252525';ctx.fill();
    ctx.strokeStyle='#181818';ctx.lineWidth=0.5;ctx.stroke();
  }
  ctx.setLineDash([4,8]);ctx.strokeStyle='rgba(255,214,0,0.18)';ctx.lineWidth=1;
  for(var i=0;i<trackDashes.length;i++){
    var pts=trackDashes[i],pp=[];
    for(var j=0;j<pts.length;j++){var p=project(pts[j][0],pts[j][1]+0.18,pts[j][2]);if(p)pp.push(p);}
    if(pp.length<2)continue;
    ctx.beginPath();ctx.moveTo(pp[0][0],pp[0][1]);
    for(var j=1;j<pp.length;j++)ctx.lineTo(pp[j][0],pp[j][1]);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  for(var i=0;i<facilityBoxes.length;i++)drawBox(facilityBoxes[i]);
  var keys=Object.keys(racingLines);
  for(var i=0;i<keys.length;i++){
    var rl=racingLines[keys[i]];
    if(!rl.visible)continue;
    var pp=[];
    for(var j=0;j<rl.pts.length;j++){var p=project(rl.pts[j][0],rl.pts[j][1],rl.pts[j][2]);if(p)pp.push(p);}
    if(pp.length<2)continue;
    ctx.beginPath();ctx.moveTo(pp[0][0],pp[0][1]);
    for(var j=1;j<pp.length;j++)ctx.lineTo(pp[j][0],pp[j][1]);
    ctx.strokeStyle=rl.color;ctx.lineWidth=2.5;ctx.stroke();
  }
}
var lastTouch=null,lastPinchDist=0,lastPinchMid=null;
canvas.addEventListener('touchstart',function(e){
  e.preventDefault();
  if(e.touches.length===1){lastTouch={x:e.touches[0].clientX,y:e.touches[0].clientY};lastPinchDist=0;}
  else if(e.touches.length===2){
    var dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY;
    lastPinchDist=Math.sqrt(dx*dx+dy*dy);
    lastPinchMid={x:(e.touches[0].clientX+e.touches[1].clientX)/2,y:(e.touches[0].clientY+e.touches[1].clientY)/2};
    lastTouch=null;
  }
},{passive:false});
canvas.addEventListener('touchmove',function(e){
  e.preventDefault();
  if(e.touches.length===1&&lastTouch){
    var dx=e.touches[0].clientX-lastTouch.x,dy=e.touches[0].clientY-lastTouch.y;
    cam.theta-=dx*0.007;
    cam.phi=Math.max(0.12,Math.min(Math.PI*0.47,cam.phi+dy*0.005));
    lastTouch={x:e.touches[0].clientX,y:e.touches[0].clientY};
    view=computeView();
  }else if(e.touches.length===2&&lastPinchDist>0){
    var dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY;
    var dist=Math.sqrt(dx*dx+dy*dy);
    cam.r=Math.max(40,Math.min(500,cam.r*lastPinchDist/dist));
    lastPinchDist=dist;
    var mx=(e.touches[0].clientX+e.touches[1].clientX)/2,my=(e.touches[0].clientY+e.touches[1].clientY)/2;
    if(lastPinchMid){
      cam.tx-=(Math.cos(cam.theta)*(mx-lastPinchMid.x)-Math.sin(cam.theta)*(my-lastPinchMid.y))*0.3;
      cam.tz+=(Math.sin(cam.theta)*(mx-lastPinchMid.x)+Math.cos(cam.theta)*(my-lastPinchMid.y))*0.3;
    }
    lastPinchMid={x:mx,y:my};
    view=computeView();
  }
},{passive:false});
canvas.addEventListener('touchend',function(e){
  if(e.touches.length===0){lastTouch=null;lastPinchDist=0;lastPinchMid=null;}
},{passive:false});
function handleMsg(e){
  try{
    var d=JSON.parse(typeof e.data==='string'?e.data:'{}');
    if(d.type==='TRACK_DATA'){
      document.getElementById('hint').style.display='none';
      var pn=document.getElementById('pname');
      if(d.payload&&d.payload.parkName){pn.textContent=d.payload.parkName;pn.style.display='block';}
      buildScene(d.payload||{});
      if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify({type:'SCENE_READY'}));
    }else if(d.type==='RESET_CAM'){
      cam.theta=0.6;cam.phi=1.0;cam.r=260;cam.tx=0;cam.ty=0;cam.tz=0;
      view=computeView();
    }
  }catch(err){}
}
window.addEventListener('message',handleMsg);
document.addEventListener('message',handleMsg);
window.addEventListener('resize',function(){
  W=window.innerWidth;H=window.innerHeight;
  canvas.width=W;canvas.height=H;
  view=computeView();
});
(function loop(){requestAnimationFrame(loop);drawScene();})();
</script>
</body>
</html>`;

export default function RPlusScreen() {
  const webviewRef = useRef<WebView>(null);
  const [selectedParkId, setSelectedParkId] = useState<string | null>(null);
  const [webviewReady, setWebviewReady] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);

  const parksQuery = useQuery<Park[]>({
    queryKey: ["rplus-parks"],
    queryFn: async () => {
      console.log("[RPlusScreen] Fetching parks...");
      const snap = await get(dbRef(database, "reycinUSA/works/pm/parks"));
      if (!snap.exists()) return [];
      const raw = snap.val() as Record<string, unknown>;
      return Object.values(raw) as Park[];
    },
  });

  useEffect(() => {
    if (
      parksQuery.data &&
      parksQuery.data.length > 0 &&
      selectedParkId === null
    ) {
      setSelectedParkId(parksQuery.data[0].id);
      console.log("[RPlusScreen] Auto-selected park:", parksQuery.data[0].id);
    }
  }, [parksQuery.data, selectedParkId]);

  const trackDataQuery = useQuery({
    queryKey: ["rplus-track-data", selectedParkId],
    enabled: !!selectedParkId,
    queryFn: async () => {
      console.log("[RPlusScreen] Fetching track data for park:", selectedParkId);
      const [segsSnap, itemsSnap, linesSnap] = await Promise.all([
        get(dbRef(database, "reycinUSA/works/pm/trackSegments")),
        get(dbRef(database, "reycinUSA/works/pm/parkItems")),
        get(dbRef(database, "reycinUSA/works/pm/racingLines")),
      ]);

      const segments: TrackSegment[] = [];
      if (segsSnap.exists()) {
        const raw = segsSnap.val() as Record<string, unknown>;
        Object.values(raw).forEach((seg) => {
          const s = seg as TrackSegment;
          if (s.parkId === selectedParkId) segments.push(s);
        });
      }

      const items: ParkItem[] = [];
      if (itemsSnap.exists()) {
        const raw = itemsSnap.val() as Record<string, unknown>;
        Object.values(raw).forEach((item) => {
          const it = item as ParkItem;
          if (it.parkId === selectedParkId) items.push(it);
        });
      }

      const racingLines: RacingLine[] = [];
      if (linesSnap.exists()) {
        const raw = linesSnap.val() as Record<string, unknown>;
        Object.values(raw).forEach((line) => {
          const l = line as RacingLine;
          if (l.parkId === selectedParkId) racingLines.push(l);
        });
      }

      console.log(
        `[RPlusScreen] Found: ${segments.length} segments, ${items.length} items, ${racingLines.length} racing lines`
      );
      return { segments, items, racingLines };
    },
  });

  const sendTrackData = useCallback(() => {
    if (!webviewRef.current || !trackDataQuery.data || !selectedParkId) return;
    const park = parksQuery.data?.find((p) => p.id === selectedParkId);
    const payload = {
      parkName: park?.name ?? "Track",
      ...trackDataQuery.data,
    };
    const msg = JSON.stringify({ type: "TRACK_DATA", payload });
    webviewRef.current.postMessage(msg);
    console.log("[RPlusScreen] Sent TRACK_DATA to WebView");
  }, [trackDataQuery.data, selectedParkId, parksQuery.data]);

  useEffect(() => {
    if (webviewReady && trackDataQuery.data) {
      setSceneReady(false);
      sendTrackData();
    }
  }, [webviewReady, trackDataQuery.data, sendTrackData]);

  const handleWebViewLoad = useCallback(() => {
    setWebviewReady(true);
    console.log("[RPlusScreen] WebView loaded");
  }, []);

  const handleWebViewMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data) as { type: string };
      if (msg.type === "SCENE_READY") {
        setSceneReady(true);
        console.log("[RPlusScreen] Scene ready");
      }
    } catch (_) {}
  }, []);

  const handleResetCamera = useCallback(() => {
    if (!webviewRef.current) return;
    webviewRef.current.postMessage(JSON.stringify({ type: "RESET_CAM" }));
  }, []);

  const handleSelectPark = useCallback(
    (parkId: string) => {
      if (parkId === selectedParkId) return;
      setSelectedParkId(parkId);
      setSceneReady(false);
      console.log("[RPlusScreen] Park selected:", parkId);
    },
    [selectedParkId]
  );

  if (Platform.OS === "web") {
    return (
      <View style={styles.webFallback}>
        <Box size={44} color="#1a1a1a" strokeWidth={1.5} />
        <Text style={styles.webFallbackTitle}>R+ 3D Track Viewer</Text>
        <Text style={styles.webFallbackSub}>
          Open on your device to explore curated tracks in 3D space
        </Text>
        <View style={styles.webFallbackHint}>
          <Text style={styles.webFallbackHintText}>
            1-finger drag to orbit  ·  2-finger pinch to zoom
          </Text>
        </View>
      </View>
    );
  }

  const isDataLoading =
    parksQuery.isLoading || trackDataQuery.isLoading || !sceneReady;
  const hasParks = (parksQuery.data ?? []).length > 0;

  return (
    <View style={styles.root}>
      <View style={styles.parkBar}>
        {parksQuery.isLoading ? (
          <View style={styles.parkBarLoading}>
            <ActivityIndicator size="small" color="#FF1801" />
            <Text style={styles.parkBarLoadingText}>LOADING FACILITIES</Text>
          </View>
        ) : !hasParks ? (
          <View style={styles.parkBarLoading}>
            <Text style={styles.parkBarLoadingText}>NO TRACKS AVAILABLE</Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.parkScrollContent}
          >
            {(parksQuery.data ?? []).map((park) => (
              <TouchableOpacity
                key={park.id}
                style={[
                  styles.parkChip,
                  selectedParkId === park.id && styles.parkChipActive,
                ]}
                onPress={() => handleSelectPark(park.id)}
                activeOpacity={0.7}
                testID={`park-chip-${park.id}`}
              >
                <Text
                  style={[
                    styles.parkChipText,
                    selectedParkId === park.id && styles.parkChipTextActive,
                  ]}
                >
                  {park.name.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        <TouchableOpacity
          style={styles.resetBtn}
          onPress={handleResetCamera}
          activeOpacity={0.7}
          testID="reset-camera-btn"
        >
          <RotateCcw size={13} color="#555" strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <View style={styles.viewport}>
        <WebView
          ref={webviewRef}
          source={{ html: TRACK_3D_HTML }}
          onLoad={handleWebViewLoad}
          onMessage={handleWebViewMessage}
          javaScriptEnabled={true}
          originWhitelist={["*"]}
          scrollEnabled={false}
          bounces={false}
          style={styles.webview}
          testID="track-3d-webview"
        />

        {isDataLoading && (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color="#FF1801" />
            <Text style={styles.loadingText}>
              {parksQuery.isLoading
                ? "LOADING PARKS"
                : trackDataQuery.isLoading
                ? "LOADING TRACK DATA"
                : "BUILDING SCENE"}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerHint}>
          Drag to orbit  ·  Pinch to zoom  ·  2-finger drag to pan
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#080808",
  },
  parkBar: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#111",
    backgroundColor: "#000",
    minHeight: 44,
  },
  parkBarLoading: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 10,
    height: 44,
  },
  parkBarLoadingText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#333",
    letterSpacing: 2,
  },
  parkScrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    flexGrow: 1,
  },
  parkChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    backgroundColor: "#0a0a0a",
  },
  parkChipActive: {
    borderColor: "#FF1801",
    backgroundColor: "rgba(255,24,1,0.08)",
  },
  parkChipText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#444",
    letterSpacing: 1.5,
  },
  parkChipTextActive: {
    color: "#FF1801",
  },
  resetBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: 1,
    borderLeftColor: "#111",
    flexShrink: 0,
  },
  viewport: {
    flex: 1,
    position: "relative",
  },
  webview: {
    flex: 1,
    backgroundColor: "#080808",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(8,8,8,0.75)",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  loadingText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#333",
    letterSpacing: 2,
  },
  footer: {
    paddingVertical: 8,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#0d0d0d",
    backgroundColor: "#000",
  },
  footerHint: {
    fontSize: 9,
    color: "#2a2a2a",
    letterSpacing: 0.5,
  },
  webFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 40,
    backgroundColor: "#080808",
  },
  webFallbackTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#222",
    marginTop: 8,
  },
  webFallbackSub: {
    fontSize: 12,
    color: "#1a1a1a",
    textAlign: "center",
    lineHeight: 18,
  },
  webFallbackHint: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#111",
    borderRadius: 6,
    backgroundColor: "#0a0a0a",
  },
  webFallbackHintText: {
    fontSize: 10,
    color: "#333",
    letterSpacing: 0.5,
  },
});
