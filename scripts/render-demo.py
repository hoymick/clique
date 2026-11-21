"""Render a labelled product walkthrough from real interface captures.
Requires Pillow, NumPy and ffmpeg. Captures are public/submission/shots/*.jpg.
This is a simulation walkthrough, never a substitute for devnet receipts.
"""
import argparse, pathlib, subprocess, textwrap, wave
from PIL import Image, ImageDraw, ImageFont, ImageOps
import numpy as np
p=argparse.ArgumentParser();p.add_argument('--font-root',required=True);p.add_argument('--work-dir',required=True);p.add_argument('--output',default='public/submission/clique-walkthrough.mp4');a=p.parse_args()
work=pathlib.Path(a.work_dir);work.mkdir(parents=True,exist_ok=True);root=pathlib.Path(a.font_root)
W,H=1920,1080;BG='#f3fbff';GREEN='#245ecc';PURPLE='#245ecc'
def font(size,mono=False):return ImageFont.truetype(str(root/('DejaVuSansMono.ttf' if mono else 'DejaVuSans.ttf')),size)
def brand(d):
 for x,y,r in [(64,37,2),(80,37,7),(64,53,7),(80,53,2)]:d.rounded_rectangle((x,y,x+12,y+12),radius=r,fill='#477af8')
 d.text((109,29),'clique.',font=font(42),fill='#082950');d.rounded_rectangle((1490,34,1856,69),radius=5,fill='#e4f1ff',outline='#8bb1e7');d.text((1507,41),'SIMULATED PRODUCT DEMO',font=font(16,True),fill=PURPLE)
scenes=[
 (None,5,'Great questions.','Stronger together.','Community-funded prediction markets on Solana.'),
 ('01-home',7,'MEET CLIQUE','A question today. A market tomorrow.','A playful new look, with clear networks and community funding goals.'),
 ('02-watchlist',7,'01 / SAVE','Keep your questions close.','Bookmark questions in your browser. Watchlists stay separate by network.'),
 ('03-share',8,'02 / INVITE','Bring your clique.','Links preserve the question and network. Sharing never commits funds.'),
 ('04-rules',9,'03 / PROPOSE','Agree on the outcome before funding.','Set the evidence source, YES / NO conditions and missing-data fallback.'),
 ('05-review',9,'04 / REVIEW','Understand your commitment.','Review the amount and estimated LP share before confirming simulated funds.'),
 ('06-activity',8,'05 / FOLLOW','A journal of your actions.','Proposals, commitments, launches, LP claims and refunds stay in this browser.'),
 ('08-lp',7,'06 / LAUNCH','Community liquidity, launched.','Fund the goal and launch after funding closes. Live vaults follow the onchain clock.'),
 ('08-lp',7,'07 / CLAIM','Your clique brought it to life.','Launch a funded market and claim your liquidity-provider shares.'),
 ('06-activity',7,'ALTERNATE PATH','Refunds are part of the journey.','Eligible unsuccessful vaults let contributors reclaim their commitment. Activity records it.'),
 ('06-activity',7,'LOCAL AND TRANSPARENT','Follow your own journey.','Activity is scoped to this browser, wallet and network. It is not imported history.'),
 ('11-devnet',8,'SEPARATE ENVIRONMENTS','Demo activity is not onchain traction.','Devnet reads PREDICT vaults. Mainnet requires Phantom and real USDC.'),
 (None,8,'Verified separately on devnet.','The full funding lifecycle passed.','Create, commit, launch, LP claim and refund. Public receipts on the judge page.'),
 (None,6,'Bring your question.','Find your clique.','clique.hoymick240.workers.dev   /   github.com/hoymick/clique'),
]

for i,(shot,duration,kicker,title,body) in enumerate(scenes):
 im=Image.new('RGB',(W,H),BG);d=ImageDraw.Draw(im);brand(d)
 if shot:
  src=Image.open('public/submission/shots/'+shot+'.jpg').convert('RGB');src.thumbnail((1830,804),Image.Resampling.LANCZOS);x=(W-src.width)//2;y=105
  im.paste(src,(x,y));d.rounded_rectangle((x-1,y-1,x+src.width,y+src.height),radius=4,outline='#ffffff26',width=1)
  d.text((64,933),kicker,font=font(15,True),fill=GREEN);d.text((64,966),title,font=font(35),fill='#082950');d.text((64,1018),body,font=font(22),fill='#506783')
 else:
  for j in range(7):d.ellipse((1250-j*32,185-j*20,1750+j*32,685+j*20),outline=('#d5e6fb' if j%2==0 else '#e4f1ff'),width=1)
  d.text((112,300),kicker,font=font(65),fill='#082950');d.text((112,404),title,font=font(74),fill=GREEN)
  for n,line in enumerate(textwrap.wrap(body,width=82)):d.text((116,558+n*42),line,font=font(28),fill='#506783')
  d.text((116,864),'PREDICT pm-AMM  /  SOLANA DEVNET INTEGRATION',font=font(17,True),fill='#506783')
 d.text((1794,1030),f'{i+1:02d} / {len(scenes):02d}',font=font(14,True),fill='#506783')
 frame=work/f'{i:02d}.png';im.save(frame)
 segment=work/f'{i:02d}.mp4'
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-loop','1','-i',str(frame),'-t',str(duration),'-vf',f'fade=t=in:st=0:d=0.3,fade=t=out:st={duration-.3}:d=0.3','-r','24','-c:v','libx264','-preset','veryfast','-threads','2','-filter_threads','1','-crf','20','-pix_fmt','yuv420p',str(segment)],check=True)
 print('Rendered scene',i+1,'/',len(scenes),flush=True)
(work/'concat.txt').write_text(''.join(f"file '{(work/f'{i:02d}.mp4').resolve()}'\n" for i in range(len(scenes))))
# Original, low-volume ambient chords. No third-party samples or licensed music.
seconds=sum(s[1] for s in scenes);sr=44100;t=np.arange(seconds*sr)/sr;audio=np.zeros_like(t)
chords=[(110,164.81,220),(87.31,130.81,174.61),(130.81,164.81,196),(98,146.83,196)]
for start in range(0,seconds,8):
 n=min(8,seconds-start);tt=np.arange(n*sr)/sr;env=np.minimum(1,tt/1.5)*np.minimum(1,(n-tt)/1.5);part=sum(np.sin(2*np.pi*f*tt) for f in chords[(start//8)%4])*env*.009
 audio[start*sr:start*sr+len(tt)]+=part
with wave.open(str(work/'ambient.wav'),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(sr);w.writeframes((np.clip(audio,-1,1)*32767).astype('<i2').tobytes())
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',str(work/'concat.txt'),'-i',str(work/'ambient.wav'),'-c:v','copy','-c:a','aac','-b:a','96k','-shortest','-movflags','+faststart',a.output],check=True)
Image.open(work/'00.png').save('public/submission/cover.jpg',quality=92)
print('Completed',seconds,'seconds:',a.output)
