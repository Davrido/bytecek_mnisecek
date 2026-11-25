import sys, json, base64, io
import numpy as np
from PIL import Image, ImageOps, ImageFilter
SRC, OUT, EX = sys.argv[1], sys.argv[2], sys.argv[3]
spec = [  # Spirina
  ('spirina-1','80d53636-image.jpg',0,None,900),
  ('spirina-2','cada41a7-image.jpg',0,None,900),
  ('spirina-3','ea7706ca-image.jpg',0,None,1300),
]
BLUE=np.array([13,108,194])/255.; LBLUE=np.array([118,176,232])/255.; WHITE=np.array([244,250,255])/255.; STEEL=np.array([119,155,184])/255.
def coarse(rng,H,W,k=2):
    n=rng.random((H//k+2,W//k+2)); return np.repeat(np.repeat(n,k,0),k,1)[:H,:W]
def lowfreq(rng,H,W,r):
    n=Image.fromarray((rng.random((H,W))*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))
    a=np.asarray(n).astype(np.float32); a=(a-a.min())/(a.max()-a.min()+1e-6); return a
meta={}
for name,f,rot,crop,ow in spec:
    im=ImageOps.exif_transpose(Image.open(f'{SRC}/{f}')).convert('RGB')
    if rot: im=im.rotate(rot,expand=True)
    if crop: im=im.crop(crop(*im.size))
    # clean version for lightbox
    full=im.copy(); full.thumbnail((1800,1800),Image.LANCZOS)
    full.save(f'{OUT}/{name}.jpg',quality=80,optimize=True,progressive=True)
    im=im.resize((ow,round(im.height*ow/im.width)),Image.LANCZOS)
    w,h=im.size; Sc=w/900; m=int(round(62*Sc)); H,W=h+2*m,w+2*m
    rng=np.random.default_rng(abs(hash(name))%2**32)
    yy,xx=np.mgrid[0:H,0:W].astype(np.float32)
    dx=np.maximum(np.maximum(m-xx,xx-(m+w-1)),0); dy=np.maximum(np.maximum(m-yy,yy-(m+h-1)),0)
    dout=np.sqrt(dx*dx+dy*dy); inside=dout==0
    din=np.minimum(np.minimum(xx-m,m+w-1-xx),np.minimum(yy-m,m+h-1-yy)); din=np.where(inside,din,0)
    n1=coarse(rng,H,W); n2=coarse(rng,H,W); low=lowfreq(rng,H,W,18*Sc)
    # photo + inner glow (screen blue, noisy)
    P=np.zeros((H,W,3),np.float32); P[m:m+h,m:m+w]=np.asarray(im).astype(np.float32)/255
    Rin=30*Sc*(0.7+0.9*low)
    gin=np.clip(1-din/Rin,0,1)**1.35*inside
    spk=(n1<gin*0.95).astype(np.float32)
    a_in=np.clip(0.82*(0.3*gin+0.7*spk),0,1)[...,None]
    scr=1-(1-P)*(1-BLUE)
    P=P+(scr-P)*a_in
    wsp=((n2<gin*0.35)&inside)[...,None]
    P=np.where(wsp,WHITE,P)
    pa=inside.astype(np.float32)
    pa=np.where(inside&(din<2*Sc)&(n2<0.45),0,pa)   # ragged edge
    # outer halo speckles
    Rout=44*Sc*(0.6+0.9*low)
    gout=np.clip(1-dout/Rout,0,1)**1.5*(~inside)
    so=(n1<gout).astype(np.float32)
    col=np.where((n2<0.45)[...,None],BLUE,np.where((n2<0.8)[...,None],LBLUE,WHITE))
    ha=np.clip(so*0.95+0.22*gout,0,1)
    hc=col*so[...,None]+LBLUE*(1-so[...,None])
    # drop shadow
    sm=Image.fromarray((inside*255).astype(np.uint8)); off=int(10*Sc)
    sm=sm.transform(sm.size,Image.AFFINE,(1,0,0,0,1,-off)).filter(ImageFilter.GaussianBlur(26*Sc))
    sa=np.asarray(sm).astype(np.float32)/255*0.5
    # composite: shadow -> halo -> photo
    C=np.zeros((H,W,3),np.float32); A=np.zeros((H,W),np.float32)
    def over(c,a):
        global C,A
        a3=a[...,None]; na=a+A*(1-a)
        C=np.where(na[...,None]>0,(c*a3+C*A[...,None]*(1-a3))/np.maximum(na,1e-6)[...,None],0); A=na
    over(np.broadcast_to(STEEL,(H,W,3)),sa); over(hc,ha); over(P,pa)
    out=Image.fromarray(np.dstack([C*255,A*255]).clip(0,255).astype(np.uint8),'RGBA')
    out.save(f'{OUT}/{name}-f.webp',quality=80,method=6,alpha_quality=80)
    tiny=out.resize((24,round(24*H/W)),Image.BILINEAR); b=io.BytesIO(); tiny.save(b,'PNG',optimize=True)
    meta[name]=dict(w=W,h=H,mx=round(100*m/W,2),my=round(100*m/H,2),tiny='data:image/png;base64,'+base64.b64encode(b.getvalue()).decode())
    print(name,(W,H),'m',m)
# připojit k existujícím metadatům
import pathlib
mp=pathlib.Path(OUT).parent/'src'/'meta.json'
old=json.load(open(mp)); old.update(meta); json.dump(old,open(mp,'w'))
print('meta merged', sorted(old))
