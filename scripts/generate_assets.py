"""Rebuild original V1 SVG artwork; no remote images or third-party art."""
from pathlib import Path
import math
import sys

ROOT = Path(__file__).resolve().parents[1] / 'public' / 'assets'
for folder in ['backgrounds', 'characters', 'products', 'effects', 'sounds']:
    (ROOT / folder).mkdir(parents=True, exist_ok=True)

def save(path, text):
    (ROOT / path).write_text(text, encoding='utf-8')

def svg(body, box='0 0 900 650'):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{box}" font-family="Microsoft JhengHei, 微軟正黑體, sans-serif">{body}</svg>'

def p(x,y,z=0):
    return 450 + .86*(x-y), 160 + .46*(x+y)-z

def poly(points, fill, stroke=None, opacity=1):
    pts=' '.join(f'{x:.2f},{y:.2f}' for x,y in points)
    return f'<polygon points="{pts}" fill="{fill}" opacity="{opacity}"'+(f' stroke="{stroke}" stroke-width="1"' if stroke else '')+'/>'

def plane(x,y,w,d,z,fill):
    return poly([p(x,y,z),p(x+w,y,z),p(x+w,y+d,z),p(x,y+d,z)],fill)

def box(x,y,w,d,z,h,top,left='#b9cbbb',right='#d1dfce'):
    return (poly([p(x,y+d,z),p(x+w,y+d,z),p(x+w,y+d,z+h),p(x,y+d,z+h)],left)+
        poly([p(x+w,y,z),p(x+w,y+d,z),p(x+w,y+d,z+h),p(x+w,y,z+h)],right)+plane(x,y,w,d,z+h,top))

def tree(x,y,scale=1):
    px,py=p(x,y)
    return f'<g transform="translate({px},{py}) scale({scale})"><ellipse cy="8" rx="27" ry="12" fill="#47785b" opacity=".12"/><path d="M-4 4 L-3 -58 L4 -58 L5 4Z" fill="#9b9b76"/><path d="M0 -27 L-18 -48 M0 -37 L18 -60" stroke="#9b9b76" stroke-width="4"/><ellipse cx="0" cy="-74" rx="29" ry="34" fill="#91ad76"/><ellipse cx="-12" cy="-73" rx="22" ry="27" fill="#b1c58b"/><ellipse cx="10" cy="-91" rx="17" ry="17" fill="#a5bf82"/></g>'

def plant(x,y,z=0,scale=1):
    px,py=p(x,y,z)
    return f'<g transform="translate({px},{py}) scale({scale})"><ellipse cy="4" rx="12" ry="6" fill="#234633" opacity=".1"/><path d="M-10 -12 L-7 4 Q0 9 7 4 L10 -12Z" fill="#d6c9aa"/><ellipse cy="-12" rx="10" ry="5" fill="#b4aa8f"/><path d="M0 -10 Q-24 -27 -14 -41 Q0 -36 0 -13 Q-7 -48 5 -50 Q17 -34 0 -10 Q9 -40 22 -31 Q20 -16 0 -10" fill="#6a936b"/><path d="M0 -12 L4 -38" stroke="#9eb382" stroke-width="1.5"/></g>'

def service_staff(x,y,z=13,role='pharmacist'):
    px,py=p(x,y,z)
    coat='#f8fff8' if role=='pharmacist' else '#2877ce'
    badge='#00866a' if role=='pharmacist' else '#ffd16a'
    title='藥師' if role=='pharmacist' else '掛號人員'
    glasses='<g fill="none" stroke="#334a50" stroke-width="1.1"><rect x="-8" y="-68" width="7" height="5" rx="2"/><rect x="1" y="-68" width="7" height="5" rx="2"/><path d="M-1 -66h2"/></g>' if role=='pharmacist' else ''
    return f'<g class="clinic-service-staff {role}" aria-label="{title}" transform="translate({px},{py})"><ellipse rx="14" ry="5" fill="#244950" opacity=".15"/><path d="M-8 -22L-8 1H-2L0 -18 2 1H8L8 -22Z" fill="#324f59"/><path d="M-10 -51Q0 -56 10 -51L12 -19Q0 -14 -12 -19Z" fill="{coat}" stroke="#d5e5df"/><path d="M-4 -51L0 -39 4 -51" fill="#fff"/><path d="M-9 -48L-16 -26 M9 -48L15 -27" stroke="{coat}" stroke-width="6" stroke-linecap="round"/><circle cx="-16" cy="-24" r="3" fill="#d8b293"/><circle cx="15" cy="-25" r="3" fill="#d8b293"/><rect x="5" y="-43" width="5" height="7" fill="{badge}"/><rect x="-3" y="-57" width="6" height="8" fill="#d8b293"/><ellipse cy="-65" rx="10" ry="12" fill="#d8b293"/><path d="M-10 -67Q-10 -80 1 -79Q12 -78 10 -66L5 -72 -5 -71Z" fill="#3c4143"/><circle cx="-4" cy="-65" r="1" fill="#243b42"/><circle cx="4" cy="-65" r="1" fill="#243b42"/><path d="M-3 -59q3 2 6 0" fill="none" stroke="#956b57"/>{glasses}</g>'

def seat(x,y):
    return box(x,y,34,31,0,15,'#cbd9c7','#94ae9d','#a3bba9')+box(x,y+24,34,6,15,29,'#bdcebd','#8da897','#a8bfaa')+plane(x+3,y+2,28,23,17,'#b1c6b5')

b='''<defs><filter id="shadow"><feGaussianBlur stdDeviation="12"/></filter><linearGradient id="wall" x2="0" y2="1"><stop stop-color="#fffef5"/><stop offset="1" stop-color="#e6eadd"/></linearGradient><linearGradient id="glass" x2="1" y2="1"><stop stop-color="#c4e5df" stop-opacity=".75"/><stop offset="1" stop-color="#86b5ad" stop-opacity=".35"/></linearGradient></defs>'''
b+=plane(-42,-28,515,430,-22,'#436d531e').replace('/>',' filter="url(#shadow)"/>')
# landscaped island, floating foundation and sidewalk
b+=box(-30,-22,480,390,-24,12,'#d5dfc8','#bac8ae','#c6d3ba')
b+=box(-15,-7,450,360,-12,12,'#edece1','#d3d6c5','#e1e1d3')
for i in range(6):
    b+=plane(60+i*48,332,40,16,1,'#d9ddcd')
b+=box(0,0,420,320,0,12,'#f2f1e7','#cbd5c5','#dbe1d0')
# tile floor
for x in range(0,421,42):
    a,c=p(x,0,13),p(x,320,13)
    b+=f'<path d="M{a[0]} {a[1]} L{c[0]} {c[1]}" stroke="#dce1d4" stroke-width=".8"/>'
for y in range(0,321,40):
    a,c=p(0,y,13),p(420,y,13)
    b+=f'<path d="M{a[0]} {a[1]} L{c[0]} {c[1]}" stroke="#dce1d4" stroke-width=".8"/>'
# rear and left walls, top trim
b+=box(-3,-4,427,9,12,141,'#f5f6ed','#e7eddf','#cbd7c5')
b+=box(-4,0,9,320,12,141,'#f5f6ed','#c4d5c3','#e1e8d9')
b+=box(-5,-5,430,11,149,6,'#fffef6','#e3e6d7','#d5ddca')
b+=box(-5,0,11,320,149,6,'#fffef6','#d2ddca','#ebeee1')
# glass window panels on back wall
for x in [30,89,148]:
    b+=poly([p(x,6,54),p(x+49,6,54),p(x+49,6,125),p(x,6,125)],'#b7d3c9','#f5f8ed')
    b+=poly([p(x+4,6,60),p(x+23,6,60),p(x+23,6,121),p(x+4,6,121)],'#dcebe1',opacity=.6)
# wall art on left wall
b+=poly([p(6,142,75),p(6,190,75),p(6,190,119),p(6,142,119)],'#f7f9ed','#b4c7ad')
a=p(7,166,95)
b+=f'<path d="M{a[0]-6} {a[1]}h12 M{a[0]} {a[1]-10}v20" stroke="#81a78d" stroke-width="4"/>'
# doctor room floor, clinical storage and back-board
b+=plane(242,12,168,135,14,'#e1e9df')
b+=box(325,13,74,24,13,55,'#f1f4e8','#c5d5c5','#d8e2d2')
for x in [335,366]:
    b+=box(x,16,22,15,68,4,'#e5eadc','#c3d1bc','#d9e3ce')
    px,py=p(x+11,17,45)
    b+=f'<circle cx="{px}" cy="{py}" r="1.7" fill="#95ac92"/>'
b+=poly([p(260,6,78),p(314,6,78),p(314,6,120),p(260,6,120)],'#f6f6ed','#9fb69d')
px,py=p(286,7,98)
b+=f'<g transform="translate({px},{py})"><circle r="11" fill="#bed4bd"/><path d="M0 -7V7 M-6 0H6" stroke="#fff" stroke-width="3"/></g>'
# doctor desk with monitor, keyboard, chair
b+=box(267,90,102,43,13,38,'#e7d9ba','#d1bf9c','#ddcdab')
b+=box(277,92,3,33,13,34,'#c2b491','#c2b491','#c2b491')
b+=box(351,92,3,33,13,34,'#c2b491','#c2b491','#c2b491')
b+=box(295,99,37,4,51,27,'#344f50','#334d4e','#536b65')
b+=poly([p(297,104,55),p(329,104,55),p(329,104,75),p(297,104,75)],'#8eaca3')
b+=plane(300,113,30,12,53,'#c2c9b6')
b+=box(340,108,15,13,51,3,'#fffdf0','#e8e7d6','#f7f5e5')
b+=seat(299,53)
b+=plant(394,29,69,.8)
# glass divider left edge of doctor room and short front partition
b+=box(233,7,5,144,13,104,'#eef4e7','#c0d6c7','#cce1d2')
b+=poly([p(240,8,27),p(240,145,27),p(240,145,105),p(240,8,105)],'url(#glass)','#b4cbbb')
b+=box(242,151,65,5,13,60,'#f5f5e9','#c8d9c9','#dee8d8')
b+=poly([p(242,156,75),p(307,156,75),p(307,156,105),p(242,156,105)],'url(#glass)','#d0e2cf')
b+=box(377,151,43,5,13,60,'#f5f5e9','#c8d9c9','#dee8d8')
# pharmacy shelving, unbranded medicine cartons and dispensing counter
b+=box(17,25,136,22,13,105,'#e7fff2','#00836d','#68c0a0')
for z in [26,50,74,98,120]:
    b+=box(17,25,136,24,z,3,'#ffffff','#c5ddd4','#e5f5ec')
for row in range(3):
    for i in range(7):
        x,z=23+i*18,30+row*24
        color=['#2877ce','#0d9b74','#e98c27'][(row+i)%3]
        b+=box(x,33,12,13,z,16,'#ffffff','#e3ede7','#fafefa')
        b+=box(x,45,12,1,z+8,4,color,color,color)
b+=service_staff(125,86,13,'pharmacist')
b+=box(34,108,129,43,13,47,'#ffffff','#007b66','#8ecbb5')
b+=plane(34,108,129,43,62,'#f7fff8')
b+=box(75,111,32,3,63,24,'#4b6763','#385450','#678078')
b+=plane(78,123,28,10,64,'#b6bda8')
b+=box(131,122,18,13,63,14,'#ffffff','#d5e7db','#f3fff6')
b+=plant(49,126,63,.65)
px,py=p(98,153,35)
b+=f'<g transform="translate({px},{py}) rotate(28)"><text text-anchor="middle" fill="#fff" font-size="13" font-weight="bold">藥 局</text></g>'
# low wall with entrance left front
b+=box(0,313,75,7,13,47,'#fbf9ec','#c5d2bf','#dae3d0')
b+=box(161,313,78,7,13,47,'#fbf9ec','#c5d2bf','#dae3d0')
b+=box(75,311,5,10,13,91,'#c2d4c5','#95b4a5','#a8c6b2')
b+=box(158,311,5,10,13,91,'#c2d4c5','#95b4a5','#a8c6b2')
b+=box(75,311,88,10,102,5,'#d8e7d8','#9eb8a8','#b5ccba')
b+=poly([p(80,315,18),p(113,315,18),p(113,315,100),p(80,315,100)],'url(#glass)','#d2e5d7')
b+=poly([p(127,315,18),p(158,315,18),p(158,315,100),p(127,315,100)],'url(#glass)','#d2e5d7')
b+=plane(88,320,58,27,13,'#c5d4c0')
# registration desk replacing all former waiting seats
b+=service_staff(367,178,13,'registration')
b+=box(257,194,118,33,13,47,'#e7d9ba','#007b66','#a8d3c0')
b+=plane(255,192,122,37,62,'#e7d9ba')
b+=box(273,197,30,4,63,25,'#344f50','#334d4e','#536b65')
b+=plane(275,211,27,10,64,'#b6c6be')
b+=box(319,213,15,10,63,7,'#1856b4','#25455e','#588ab6')
b+=box(345,199,18,13,63,13,'#ffffff','#d0dce1','#e9f5fa')
b+=plane(348,212,12,17,70,'#ffffff')
b+=box(322,198,3,3,63,22,'#7d9b9c','#7d9b9c','#7d9b9c')
px,py=p(323,201,90)
b+=f'<g transform="translate({px},{py})"><rect x="-18" y="-12" width="36" height="18" rx="2" fill="#142e43"/><text text-anchor="middle" y="1" fill="#ffe05b" font-size="12" font-weight="bold">008</text></g>'
px,py=p(316,229,34)
b+=f'<g transform="translate({px},{py}) rotate(28)"><text text-anchor="middle" fill="#fff" font-size="12" font-weight="bold">掛號櫃台</text></g>'
b+=box(395,280,18,20,13,55,'#f6f7ed','#ccd8c7','#e1e7d8')
b+=box(398,284,12,12,68,13,'#a8ccc2','#a1c6ba','#b5d8ca')
b+=plant(400,171,13,.9)+plant(28,280,13,1.2)
# front exterior sign and landscape
b+=box(208,337,83,8,0,33,'#d4e0cb','#4c7866','#71947b')
px,py=p(248,346,13)
b+=f'<g transform="translate({px},{py}) rotate(28)"><text text-anchor="middle" fill="#f6faed" font-size="10" letter-spacing="3">生達診所</text></g>'
b+=tree(-42,112,.9)+tree(461,70,1.05)+tree(439,330,.75)
for x,y,s in [(8,355,.5),(-25,295,.6),(440,215,.55)]: b+=plant(x,y,0,s)
b+=plane(190,355,39,8,-2,'#b2bea4')
save('backgrounds/clinic.svg',svg(b))
if '--clinic-only' in sys.argv:
    print('Updated clinic SVG only: pharmacy and registration.')
    raise SystemExit(0)

save('backgrounds/entrance.svg',svg('<rect x="65" y="20" width="170" height="220" rx="5" fill="#d0e3d8"/><rect x="80" y="42" width="140" height="180" fill="#9dbfb8"/><path d="M150 43v180" stroke="#eaf2e8" stroke-width="5"/><rect x="140" y="115" width="5" height="30" rx="2" fill="#fafbed"/><text x="150" y="30" font-size="15" text-anchor="middle" fill="#375f4e">生達診所</text>','0 0 300 260'))

# Full-height portraits: entirely original geometric vector people.
rep='''<ellipse cx="60" cy="201" rx="29" ry="7" fill="#294a3f" opacity=".13"/><path d="M43 130L45 196H57L62 138 67 196H80L77 130Z" fill="#263d49"/><path d="M43 194h16v9H41q-2-5 2-9M66 194h17v9H64q0-6 2-9" fill="#1c3238"/><path d="M36 65Q60 53 84 65L87 129Q61 143 32 130Z" fill="#4c7771"/><path d="M47 64L60 85 73 64" fill="#edf1e5"/><path d="M58 80L55 112 61 119 66 111 62 81" fill="#b0c591"/><path d="M36 67Q26 71 23 84L16 121 24 124 40 89" fill="#5d867d"/><path d="M82 68Q91 70 94 86L103 115 94 120 78 87" fill="#41655f"/><path d="M15 119L24 123 22 135Q17 142 13 133Z M94 115L103 113 106 127Q103 135 97 130Z" fill="#d1ab8b"/><rect x="82" y="124" width="30" height="29" rx="4" fill="#675f4d"/><path d="M91 124v-5h12v5" fill="none" stroke="#675f4d" stroke-width="3"/><path d="M89 127h17" stroke="#847b61"/><path d="M52 51v13q8 13 18 0V51" fill="#cda687"/><ellipse cx="60" cy="34" rx="22" ry="26" fill="#ddb99a"/><path d="M37 30Q33 1 59 4q29-1 25 30L76 22 60 19 43 26 42 37Z" fill="#263e3f"/><path d="M40 30q-7-2-5 8t7 7M80 30q7-2 5 8t-7 7" fill="#d7b292"/><path d="M47 34h8 M65 34h8" stroke="#3e4f48" stroke-width="2"/><circle cx="51" cy="36" r="1.4" fill="#334d48"/><circle cx="69" cy="36" r="1.4" fill="#334d48"/><path d="M55 47q6 4 12-1" stroke="#a0765b" stroke-width="1.5" fill="none"/><path d="M73 82v17" stroke="#a5c0ac"/><rect x="69" y="88" width="13" height="17" rx="2" fill="#e4ebdc"/><rect x="72" y="91" width="7" height="4" fill="#88a68a"/>'''
save('characters/representative.svg',svg(rep,'0 0 120 210'))
doctor='''<ellipse cx="60" cy="202" rx="30" ry="6" fill="#294a3f" opacity=".1"/><path d="M39 139L42 194H55L60 148 65 194H79L81 139Z" fill="#53696b"/><path d="M41 192h16v10H37q-1-7 4-10M65 192h16l3 10H63Z" fill="#304548"/><path d="M34 68Q60 54 86 68L91 151Q60 164 29 151Z" fill="#fbfcf3" stroke="#dbe3d7"/><path d="M49 62L60 86 72 62 75 124H46Z" fill="#a6bfba"/><path d="M47 64L36 87 49 91 45 102 59 143 60 87Z M73 64L85 87 73 92 77 102 62 143 61 87Z" fill="#eaf0e5"/><path d="M34 71Q21 77 20 92L14 132 26 136 41 91 M85 71Q98 79 99 95L105 132 93 136 78 91" fill="#fafcf3" stroke="#dce4d8"/><path d="M15 131L26 135 24 145Q19 152 13 143Z M94 134L104 131 108 143Q105 151 98 146Z" fill="#d6b195"/><path d="M51 49v16q9 10 18 0V49" fill="#cca58d"/><ellipse cx="60" cy="34" rx="22" ry="26" fill="#dfbca0"/><path d="M38 28Q34 3 58 3q26-3 26 26L77 19 63 15 44 23 41 34Z" fill="#586464"/><path d="M39 25q-8 4-3 17l5 1 M81 25q8 4 3 17l-5 1" fill="#d2ad93"/><g fill="none" stroke="#526764" stroke-width="1.5"><rect x="43" y="30" width="14" height="11" rx="4"/><rect x="64" y="30" width="14" height="11" rx="4"/><path d="M57 34h7M39 31h5M77 31h5"/></g><circle cx="50" cy="35" r="1.2" fill="#405852"/><circle cx="70" cy="35" r="1.2" fill="#405852"/><path d="M55 47q6 4 12-1" fill="none" stroke="#a37d64" stroke-width="1.5"/><path d="M44 75Q31 116 50 116Q61 115 51 92 M73 76Q86 108 72 115" fill="none" stroke="#476864" stroke-width="3"/><circle cx="72" cy="116" r="5" fill="#698c85"/><rect x="70" y="129" width="15" height="15" rx="2" fill="#edf2e7" stroke="#d0decc"/><path d="M75 88h12v16H75Z" fill="#b9ccbc"/><path d="M77 92h8M77 96h6" stroke="#fff" stroke-width="1"/>'''
save('characters/doctor.svg',svg(doctor,'0 0 120 210'))

consult='''<defs><linearGradient id="bg" x2="0" y2="1"><stop stop-color="#eff3e8"/><stop offset="1" stop-color="#d4e2d0"/></linearGradient></defs><rect width="800" height="650" fill="url(#bg)"/><path d="M0 0H800V420L410 516 0 390Z" fill="#eef2e7"/><path d="M410 0V516L800 420V0Z" fill="#e1eada"/><path d="M0 390L410 516 800 420V650H0Z" fill="#cddbc5"/><path d="M0 391L410 517 800 421" fill="none" stroke="#a9bfa6" stroke-width="7"/><g fill="none" stroke="#dce5d4" stroke-width="1"><path d="M0 480L550 650 M0 585L200 650 M240 466L800 638 M440 510L0 630 M635 460L93 650 M795 510L410 650"/></g><path d="M70 83L304 152V331L70 262Z" fill="#b1cec2" stroke="#fbfcf2" stroke-width="10"/><path d="M185 117V296M73 179L300 245" stroke="#f6f9ed" stroke-width="5"/><path d="M85 91L166 115V287L85 264Z" fill="#e2ecda" opacity=".45"/><path d="M578 94L672 68V190L578 215Z" fill="#f9faed" stroke="#b3c4a8" stroke-width="4"/><path d="M595 117L652 102M595 136L652 120M595 153L637 141" stroke="#c2d2b7" stroke-width="4"/><path d="M611 172l11-3" stroke="#80a284" stroke-width="4"/><path d="M568 323L760 274V395L568 445Z" fill="#b5c9ad"/><path d="M568 323L760 274 720 252 530 302Z" fill="#e8eddb"/><path d="M530 302L568 323V445L530 419Z" fill="#99b393"/><path d="M666 303V418" stroke="#d5e1cc" stroke-width="2"/><circle cx="652" cy="366" r="3" fill="#789878"/><circle cx="681" cy="358" r="3" fill="#789878"/><ellipse cx="520" cy="352" rx="36" ry="12" fill="#335b5130"/><path d="M494 254Q521 240 547 254L553 359Q523 373 486 360Z" fill="#6e9486"/><path d="M494 263Q520 252 543 264" stroke="#91b29e" fill="none" stroke-width="4"/><path d="M402 405L616 350 717 403 500 465Z" fill="#dbcaaa"/><path d="M500 465L717 403V426L500 491Z" fill="#bcaa87"/><path d="M402 405L500 465V491L402 431Z" fill="#c9b694"/><path d="M425 438L442 447V555L425 546 M670 445L686 440V525L670 530" fill="#b39e7b"/><path d="M538 363L597 348V407L538 424Z" fill="#3b5a54"/><path d="M543 367L592 355V402L543 415Z" fill="#a0bdb0"/><path d="M562 416V432L581 427V411Z" fill="#7c9484"/><path d="M542 440L585 427 607 439 562 452Z" fill="#aab49a"/><path d="M629 417L660 409 678 417 648 426Z" fill="#fff9e6"/><path d="M633 413L656 408" stroke="#a2b59b" stroke-width="1"/><path d="M105 376L146 388 139 444 111 436Z" fill="#c6bda1"/><ellipse cx="125" cy="382" rx="22" ry="10" fill="#aba78d"/><path d="M124 379Q78 335 92 309Q127 309 126 377Q109 300 136 280Q160 300 126 377Q145 320 170 331Q164 367 124 379" fill="#779b70"/><path d="M123 380L135 306" stroke="#a9bd8a" stroke-width="3"/><g transform="translate(472,123)"><circle r="22" fill="#f6f8ea" stroke="#b6c8ac" stroke-width="3"/><path d="M0 -14V0L10 4" fill="none" stroke="#6f8f73" stroke-width="3"/></g>'''
save('backgrounds/consultation.svg',svg(consult,'0 0 800 650'))
desk = consult[consult.index('<path d="M402 405'):consult.index('<path d="M105 376')]
save('backgrounds/consultation-desk.svg', svg(desk, '0 0 800 650'))

product='''<defs><linearGradient id="pack" x2="1" y2="1"><stop stop-color="#fffef5"/><stop offset="1" stop-color="#e5eddb"/></linearGradient></defs><ellipse cx="156" cy="244" rx="102" ry="15" fill="#426345" opacity=".08"/><path d="M61 72L182 39 246 72 125 107Z" fill="#fffef6"/><path d="M125 107L246 72V218L125 254Z" fill="#b7d1b3"/><path d="M61 72L125 107V254L61 218Z" fill="url(#pack)"/><path d="M125 107L246 72V116L125 151Z" fill="#457966"/><path d="M61 72L125 107V151L61 117Z" fill="#5c8a70"/><path d="M125 214L246 179V218L125 254Z" fill="#e1e9cf"/><g transform="matrix(.88,-.25,0,1,138,143)"><text x="0" y="0" fill="#f5faed" font-size="9" letter-spacing="1.5">DEMO-01</text><text x="0" y="36" fill="#315f4d" font-size="16" font-weight="bold">澄心示範錠</text><text x="0" y="53" fill="#72946f" font-size="7">TRAINING USE ONLY</text><path d="M0 74H101" stroke="#a1bc95"/><text x="0" y="91" fill="#7f9b74" font-size="7">虛構產品 · 非真實藥品</text></g><path d="M75 142l32 18M75 150l32 18M75 158l24 14" stroke="#c2ceb6" stroke-width="2"/><path d="M185 205l10-3v-10l10-3v10l10-3v10l-10 3v10l-10 3v-10l-10 3Z" fill="#99b78a"/><g transform="translate(33,218) rotate(-18)"><rect x="0" y="0" width="81" height="47" rx="5" fill="#d1dbce" stroke="#e7eee0"/><g fill="#eaf0e5" stroke="#b8c9b2" stroke-width="1"><ellipse cx="16" cy="14" rx="9" ry="6"/><ellipse cx="41" cy="14" rx="9" ry="6"/><ellipse cx="66" cy="14" rx="9" ry="6"/><ellipse cx="16" cy="34" rx="9" ry="6"/><ellipse cx="41" cy="34" rx="9" ry="6"/><ellipse cx="66" cy="34" rx="9" ry="6"/></g></g>'''
save('products/demo-product.svg',svg(product,'0 0 300 290'))

success='''<g fill="none" stroke="#b3c989" stroke-width="2"><path d="M20 28l-5-6M102 20l4-8M113 91l8 2M15 91l-7 4"/></g><circle cx="64" cy="64" r="45" fill="#e9f1d9"/><circle cx="64" cy="64" r="35" fill="#d7e8b6" stroke="#bdd293" stroke-width="1.5"/><path d="M43 69L55 81 85 49" stroke="#658653" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M38 103L35 123 53 117 64 128 73 108M76 105L86 125 93 111 107 113 96 96" fill="#c3d99c"/><g fill="#9bbd6d"><circle cx="18" cy="58" r="2.5"/><circle cx="102" cy="33" r="2"/><path d="M22 106l3-7 3 7-3 7Z M111 62l3-7 3 7-3 7Z"/></g>'''
save('effects/success.svg',svg(success,'0 0 128 133'))
save('effects/mark.svg',svg('<rect width="64" height="64" rx="16" fill="#183e3b"/><path d="M26 14h12v12h12v12H38v12H26V38H14V26h12Z" fill="#d4ef83"/>','0 0 64 64'))
(ROOT/'sounds'/'README.txt').write_text('V1音效由 Web Audio API 即時合成，預設關閉，不依賴外部音檔。可於 src/hooks/useSound.ts 替換為授權音檔。', encoding='utf-8')
print('Generated 9 original SVG assets and sound notes.')
