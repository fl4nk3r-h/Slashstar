/* ── State ─────────────────────────────────────────────────────────────── */
const TYPES = ['Class','Interface','Enum','Method','Constructor','Field'];
let currentType = 'Class';

const LICENSE_TEMPLATES = {
  none: null,
  gpl2: [
    ' * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.',
    ' *',
    ' * This code is free software; you can redistribute it and/or modify it',
    ' * under the terms of the GNU General Public License version 2 only, as',
    ' * published by the Free Software Foundation.',
    ' *',
    ' * This code is distributed in the hope that it will be useful, but WITHOUT',
    ' * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or',
    ' * FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License',
    ' * version 2 for more details (a copy is included in the LICENSE file that',
    ' * accompanied this code).',
    ' *',
    ' * You should have received a copy of the GNU General Public License version',
    ' * 2 along with this work; if not, write to the Free Software Foundation,',
    ' * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.',
  ],
  mit: [
    ' * Permission is hereby granted, free of charge, to any person obtaining a copy',
    ' * of this software and associated documentation files (the "Software"), to deal',
    ' * in the Software without restriction, including without limitation the rights',
    ' * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell',
    ' * copies of the Software, and to permit persons to whom the Software is',
    ' * furnished to do so, subject to the following conditions:',
    ' *',
    ' * The above copyright notice and this permission notice shall be included in all',
    ' * copies or substantial portions of the Software.',
    ' *',
    ' * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR',
    ' * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,',
    ' * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE',
    ' * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER',
    ' * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,',
    ' * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE',
    ' * SOFTWARE.',
  ],
  apache2: [
    ' * Licensed under the Apache License, Version 2.0 (the "License");',
    ' * you may not use this file except in compliance with the License.',
    ' * You may obtain a copy of the License at',
    ' *',
    ' *     http://www.apache.org/licenses/LICENSE-2.0',
    ' *',
    ' * Unless required by applicable law or agreed to in writing, software',
    ' * distributed under the License is distributed on an "AS IS" BASIS,',
    ' * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.',
    ' * See the License for the specific language governing permissions and',
    ' * limitations under the License.',
  ],
  bsd2: [
    ' * Redistribution and use in source and binary forms, with or without',
    ' * modification, are permitted provided that the following conditions are met:',
    ' *',
    ' * 1. Redistributions of source code must retain the above copyright notice,',
    ' *    this list of conditions and the following disclaimer.',
    ' *',
    ' * 2. Redistributions in binary form must reproduce the above copyright notice,',
    ' *    this list of conditions and the following disclaimer in the documentation',
    ' *    and/or other materials provided with the distribution.',
    ' *',
    ' * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"',
    ' * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE',
    ' * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE',
    ' * ARE DISCLAIMED.',
  ],
};

let state = {
  hasCopyright: false,
  copyrightHolder: '',
  copyrightStartYear: String(new Date().getFullYear()),
  copyrightEndYear:   String(new Date().getFullYear()),
  license: 'none',
  customLicense: '',

  hasPackage: false,
  packageName: '',
  imports: [''],

  name: '', desc: '', author: '', version: '', since: '',
  deprecated: '', see: [''],
  typeParams: [{ name: '', desc: '' }],
  params: [{ ptype: '', name: '', desc: '' }],
  returns: { rtype: '', desc: '' },
  throws: [{ etype: '', desc: '' }],
};

const isClass  = t => ['Class','Interface','Enum'].includes(t);
const isMethod = t => ['Method','Constructor'].includes(t);

/* ── Tabs ──────────────────────────────────────────────────────────────── */
const tabsEl = document.getElementById('tabs');
TYPES.forEach(t => {
  const btn = document.createElement('button');
  btn.textContent = t;
  btn.className = 'tab' + (t === currentType ? ' active' : '');
  btn.onclick = () => { currentType = t; renderTabs(); renderForm(); renderOutput(); };
  tabsEl.appendChild(btn);
});
function renderTabs() {
  tabsEl.querySelectorAll('.tab').forEach(b => {
    b.className = 'tab' + (b.textContent === currentType ? ' active' : '');
  });
}

/* ── DOM helpers ───────────────────────────────────────────────────────── */
function el(tag, attrs, ...children) {
  const e = document.createElement(tag);
  if (attrs) Object.entries(attrs).forEach(([k,v]) => { if (k==='style') e.style.cssText=v; else e[k]=v; });
  children.forEach(c => c && e.appendChild(typeof c==='string' ? document.createTextNode(c) : c));
  return e;
}
function mkInput(ph, val, cb) {
  const i = el('input',{type:'text',placeholder:ph,value:val}); i.oninput=cb; return i;
}
function mkTextarea(rows,ph,val,cb) {
  const t = el('textarea',{rows,placeholder:ph}); t.value=val; t.oninput=cb; return t;
}
function mkLabel(txt) { return el('label',null,txt); }
function fg(lbl,inp) {
  const g=el('div',{className:'field-group'}); if(lbl) g.appendChild(mkLabel(lbl)); g.appendChild(inp); return g;
}
function mkSelect(opts,val,cb) {
  const s=el('select'); s.onchange=cb;
  opts.forEach(([v,t])=>{ const o=el('option',{value:v},t); if(v===val) o.selected=true; s.appendChild(o); });
  return s;
}
function subTitle(txt) { return el('div',{className:'sub-title'},txt); }
function rmBtn(cb)  { const b=el('button',{className:'remove-btn'},'×'); b.onclick=cb; return b; }
function addBtn(txt,cb) { const b=el('button',{className:'add-btn'},txt); b.onclick=cb; return b; }

/* Collapsible section */
function section(title, badge, open, buildFn) {
  const wrap = el('div',{className:'section'});
  const arr  = el('span',{className:'section-arrow'+(open?' open':'')},'▶');
  const lbl  = el('span',{className:'section-label'},title);
  const hdr  = el('div',{className:'section-header'},arr,lbl);
  if (badge) hdr.appendChild(el('span',{className:'section-badge'},badge));
  const body = el('div',{className:'section-body'+(open?' open':'')});
  buildFn(body);
  hdr.onclick = () => { const o=body.classList.toggle('open'); arr.classList.toggle('open',o); };
  wrap.append(hdr,body); return wrap;
}

/* Inline tag chips for description textarea */
function tagHints(textarea) {
  const wrap = el('div',{className:'tag-hints'});
  ['{@code }','{@link }','<p>','<strong>','<em>','<pre>','<i>','<ul>','<li>'].forEach(tag => {
    const c = el('span',{className:'chip'},tag);
    c.onclick = () => {
      const s=textarea.selectionStart, e=textarea.selectionEnd;
      textarea.value = textarea.value.slice(0,s)+tag+textarea.value.slice(e);
      textarea.focus(); textarea.setSelectionRange(s+tag.length, s+tag.length);
      state.desc=textarea.value; renderOutput();
    };
    wrap.appendChild(c);
  });
  return wrap;
}

/* ── Render Form ────────────────────────────────────────────────────────── */
function renderForm() {
  const f = document.getElementById('form-fields'); f.innerHTML='';

  /* 1 ── Copyright / File Header */
  f.appendChild(section('Copyright / File Header', 'optional', state.hasCopyright, body => {
    const inner = el('div');
    const cb = el('input',{type:'checkbox',id:'chk-copy'}); cb.checked=state.hasCopyright;
    const cbl = el('label',{htmlFor:'chk-copy'},'Include copyright header in output');
    body.appendChild(el('div',{className:'check-row'},cb,cbl));
    cb.onchange = e => { state.hasCopyright=e.target.checked; inner.style.display=e.target.checked?'block':'none'; renderOutput(); };
    inner.style.display = state.hasCopyright?'block':'none';

    const yr = el('div',{className:'two-col'});
    yr.appendChild(fg('Start Year', mkInput('1997', state.copyrightStartYear, e=>{ state.copyrightStartYear=e.target.value; renderOutput(); })));
    yr.appendChild(fg('End Year',   mkInput('2024', state.copyrightEndYear,   e=>{ state.copyrightEndYear=e.target.value;   renderOutput(); })));
    inner.appendChild(yr);
    inner.appendChild(fg('Copyright Holder', mkInput('Organization and/or its affiliates', state.copyrightHolder, e=>{ state.copyrightHolder=e.target.value; renderOutput(); })));

    const licSel = mkSelect([
      ['none','Copyright notice only'],
      ['gpl2','GNU GPL v2 (OpenJDK style)'],
      ['mit','MIT'],
      ['apache2','Apache 2.0'],
      ['bsd2','BSD 2-Clause'],
      ['custom','Custom text'],
    ], state.license, e=>{ state.license=e.target.value; customWrap.style.display=e.target.value==='custom'?'block':'none'; renderOutput(); });
    inner.appendChild(fg('License', licSel));

    const customWrap = el('div',{style:'margin-top:6px;'}); customWrap.style.display=state.license==='custom'?'block':'none';
    const cta = mkTextarea(4,'Paste your custom license lines here...', state.customLicense, e=>{ state.customLicense=e.target.value; renderOutput(); });
    customWrap.appendChild(cta); inner.appendChild(customWrap);
    body.appendChild(inner);
  }));

  /* 2 ── Package & Imports */
  f.appendChild(section('Package & Imports', 'optional', state.hasPackage || state.imports.some(i=>i.trim()), body => {
    const pkgWrap = el('div'); pkgWrap.style.display=state.hasPackage?'block':'none';
    pkgWrap.appendChild(fg('Package Name', mkInput('com.example.mypackage', state.packageName, e=>{ state.packageName=e.target.value; renderOutput(); })));
    const cb2 = el('input',{type:'checkbox',id:'chk-pkg'}); cb2.checked=state.hasPackage;
    const cbl2 = el('label',{htmlFor:'chk-pkg'},'Include package declaration');
    cb2.onchange = e => { state.hasPackage=e.target.checked; pkgWrap.style.display=e.target.checked?'block':'none'; renderOutput(); };
    body.appendChild(el('div',{className:'check-row'},cb2,cbl2));
    body.appendChild(pkgWrap);

    body.appendChild(subTitle('Imports'));
    const importList = el('div');
    function renderImports() {
      importList.innerHTML='';
      state.imports.forEach((imp,i) => {
        const row=el('div',{className:'dyn-row'});
        const inp=mkInput('java.util.List', imp, e=>{ state.imports[i]=e.target.value; renderOutput(); });
        row.append(inp, rmBtn(()=>{ state.imports.splice(i,1); renderImports(); renderOutput(); }));
        importList.appendChild(row);
      });
    }
    renderImports(); body.appendChild(importList);
    body.appendChild(addBtn('+ add import', ()=>{ state.imports.push(''); renderImports(); renderOutput(); }));
  }));

  /* 3 ── Name & Description */
  f.appendChild(section('Name & Description', '', true, body => {
    const nameLbl =
      currentType==='Field' ? 'Field Name' :
      currentType==='Method' ? 'Method Name' :
      currentType==='Constructor' ? 'Class Name' :
      currentType+' Name';
    const namePH =
      currentType==='Method' ? 'calculateTotal' :
      currentType==='Field'  ? 'MAX_SIZE' : 'MyClass';
    body.appendChild(fg(nameLbl, mkInput(namePH, state.name, e=>{ state.name=e.target.value; renderOutput(); })));

    const dTA = mkTextarea(4, 'Describe the purpose and behaviour.\nSupports {@code X}, {@link Y#m()}, <p>, <strong> etc.', state.desc, e=>{ state.desc=e.target.value; renderOutput(); });
    body.appendChild(tagHints(dTA));
    body.appendChild(fg('Description', dTA));
  }));

  /* 4 ── Class-level: Author, Version, Since, Generic type params */
  if (isClass(currentType)) {
    f.appendChild(section('Author, Version & Since', '', true, body => {
      body.appendChild(fg('Author(s) — comma-separated', mkInput('John Doe, Alex Smith', state.author, e=>{ state.author=e.target.value; renderOutput(); })));
      const vc=el('div',{className:'two-col'});
      vc.appendChild(fg('Version', mkInput('1.0.0', state.version, e=>{ state.version=e.target.value; renderOutput(); })));
      vc.appendChild(fg('Since',   mkInput('1.2',   state.since,   e=>{ state.since=e.target.value;   renderOutput(); })));
      body.appendChild(vc);
    }));

    f.appendChild(section('@param <T> — Generic Type Parameters', 'optional', false, body => {
      const list=el('div');
      function renderTP() {
        list.innerHTML='';
        state.typeParams.forEach((p,i)=>{
          const row=el('div',{className:'dyn-row'});
          const n=mkInput('<E>', p.name, e=>{ state.typeParams[i].name=e.target.value; renderOutput(); }); n.style.maxWidth='80px';
          const d=mkInput('the type of elements in this list', p.desc, e=>{ state.typeParams[i].desc=e.target.value; renderOutput(); });
          row.append(n,d,rmBtn(()=>{ state.typeParams.splice(i,1); renderTP(); renderOutput(); }));
          list.appendChild(row);
        });
      }
      renderTP(); body.appendChild(list);
      body.appendChild(addBtn('+ add type param', ()=>{ state.typeParams.push({name:'',desc:''}); renderTP(); renderOutput(); }));
    }));
  }

  /* 5 ── Method-level: since/author, params, returns, throws */
  if (isMethod(currentType)) {
    f.appendChild(section('Since & Author', 'optional', false, body => {
      const vc=el('div',{className:'two-col'});
      vc.appendChild(fg('Since',  mkInput('1.0', state.since,  e=>{ state.since=e.target.value;  renderOutput(); })));
      vc.appendChild(fg('Author', mkInput('',    state.author, e=>{ state.author=e.target.value; renderOutput(); })));
      body.appendChild(vc);
    }));

    f.appendChild(section('@param — Parameters', '', true, body => {
      const list=el('div');
      function renderParams() {
        list.innerHTML='';
        state.params.forEach((p,i)=>{
          const row=el('div',{className:'dyn-row'});
          const t=mkInput('Type',        p.ptype, e=>{ state.params[i].ptype=e.target.value; renderOutput(); });
          const n=mkInput('name',        p.name,  e=>{ state.params[i].name=e.target.value;  renderOutput(); });
          const d=mkInput('description', p.desc,  e=>{ state.params[i].desc=e.target.value;  renderOutput(); });
          row.append(t,n,d,rmBtn(()=>{ state.params.splice(i,1); renderParams(); renderOutput(); }));
          list.appendChild(row);
        });
      }
      renderParams(); body.appendChild(list);
      body.appendChild(addBtn('+ add parameter', ()=>{ state.params.push({ptype:'',name:'',desc:''}); renderParams(); renderOutput(); }));
    }));

    if (currentType==='Method') {
      f.appendChild(section('@return — Return Value', '', true, body => {
        const row=el('div',{className:'dyn-row'});
        row.appendChild(mkInput('Return type', state.returns.rtype, e=>{ state.returns.rtype=e.target.value; renderOutput(); }));
        row.appendChild(mkInput('What is returned', state.returns.desc, e=>{ state.returns.desc=e.target.value; renderOutput(); }));
        body.appendChild(row);
      }));
    }

    f.appendChild(section('@throws — Exceptions', 'optional', false, body => {
      const list=el('div');
      function renderThrows() {
        list.innerHTML='';
        state.throws.forEach((t,i)=>{
          const row=el('div',{className:'dyn-row'});
          const e2=mkInput('ExceptionType', t.etype, e=>{ state.throws[i].etype=e.target.value; renderOutput(); });
          const d =mkInput('when thrown',   t.desc,  e=>{ state.throws[i].desc=e.target.value;  renderOutput(); });
          row.append(e2,d,rmBtn(()=>{ state.throws.splice(i,1); renderThrows(); renderOutput(); }));
          list.appendChild(row);
        });
      }
      renderThrows(); body.appendChild(list);
      body.appendChild(addBtn('+ add throws', ()=>{ state.throws.push({etype:'',desc:''}); renderThrows(); renderOutput(); }));
    }));
  }

  if (currentType==='Field') {
    f.appendChild(section('Since', 'optional', false, body => {
      body.appendChild(fg('Since', mkInput('1.0', state.since, e=>{ state.since=e.target.value; renderOutput(); })));
    }));
  }

  /* 6 ── Deprecated */
  f.appendChild(section('@deprecated', 'optional', !!state.deprecated, body => {
    body.appendChild(fg('', mkInput('Use {@link NewClass} instead', state.deprecated, e=>{ state.deprecated=e.target.value; renderOutput(); })));
  }));

  /* 7 ── @see */
  f.appendChild(section('@see — Cross References', 'optional', false, body => {
    const list=el('div');
    function renderSee() {
      list.innerHTML='';
      state.see.forEach((s,i)=>{
        const row=el('div',{className:'dyn-row'});
        const inp=mkInput('Collection', s, e=>{ state.see[i]=e.target.value; renderOutput(); });
        row.append(inp,rmBtn(()=>{ state.see.splice(i,1); renderSee(); renderOutput(); }));
        list.appendChild(row);
      });
    }
    renderSee(); body.appendChild(list);
    body.appendChild(addBtn('+ add @see', ()=>{ state.see.push(''); renderSee(); renderOutput(); }));
  }));
}

/* ── Generate output lines ─────────────────────────────────────────────── */
function generate() {
  // Each line: { text, kind }
  const out = [];
  const line = (text, kind) => out.push({ text, kind });
  const comment = text => line(text, 'comment');

  /* Copyright block */
  if (state.hasCopyright) {
    const holder = state.copyrightHolder.trim() || 'The Author';
    const sy = state.copyrightStartYear.trim();
    const ey = state.copyrightEndYear.trim();
    const yr = (sy && ey && sy!==ey) ? `${sy}, ${ey}` : (ey||sy||new Date().getFullYear());
    comment('/*');
    comment(` * Copyright (c) ${yr}, ${holder}. All rights reserved.`);
    const tpl = state.license==='custom'
      ? (state.customLicense.trim() ? state.customLicense.trim().split('\n').map(l=>' * '+l) : null)
      : LICENSE_TEMPLATES[state.license];
    if (tpl) { comment(' *'); tpl.forEach(l=>comment(l)); }
    comment(' */');
    line('', 'blank');
  }

  /* Package */
  if (state.hasPackage && state.packageName.trim()) {
    line(`package ${state.packageName.trim()};`, 'pkg');
    line('', 'blank');
  }

  /* Imports */
  const validImports = state.imports.filter(i=>i.trim());
  if (validImports.length) {
    validImports.forEach(i=>line(`import ${i.trim()};`, 'imp'));
    line('', 'blank');
  }

  /* JavaDoc */
  comment('/**');

  if (state.desc.trim()) {
    state.desc.trim().split('\n').forEach(l=>comment(` * ${l}`));
    comment(' *');
  }

  /* Generic type params */
  if (isClass(currentType)) {
    state.typeParams.filter(p=>p.name.trim()||p.desc.trim()).forEach(p=>{
      line(` * @param ${p.name.trim()||'<T>'}${p.desc.trim()?' '+p.desc.trim():''}`, 'tag');
    });
  }

  /* Class tags */
  if (isClass(currentType)) {
    if (state.author.trim()) {
      state.author.split(',').map(a=>a.trim()).filter(Boolean)
        .forEach(a=>line(` * @author  ${a}`, 'tag'));
    }
    if (state.version.trim()) line(` * @version ${state.version.trim()}`, 'tag');
  }
  if ((isClass(currentType)||currentType==='Field') && state.since.trim())
    line(` * @since   ${state.since.trim()}`, 'tag');

  /* Method tags */
  if (isMethod(currentType)) {
    if (state.author.trim()) line(` * @author  ${state.author.trim()}`, 'tag');
    if (state.since.trim())  line(` * @since   ${state.since.trim()}`, 'tag');

    state.params.filter(p=>p.name.trim()||p.desc.trim()).forEach(p=>{
      const tp = p.ptype.trim() ? `(${p.ptype.trim()}) ` : '';
      line(` * @param   ${tp}${p.name.trim()||'param'}${p.desc.trim()?' '+p.desc.trim():''}`, 'tag');
    });
    if (currentType==='Method' && (state.returns.rtype.trim()||state.returns.desc.trim())) {
      const rt = state.returns.rtype.trim() ? `{${state.returns.rtype.trim()}} ` : '';
      line(` * @return  ${rt}${state.returns.desc.trim()}`, 'tag');
    }
    state.throws.filter(t=>t.etype.trim()||t.desc.trim()).forEach(t=>{
      line(` * @throws  ${t.etype.trim()||'Exception'}${t.desc.trim()?' '+t.desc.trim():''}`, 'tag');
    });
  }

  if (state.deprecated.trim()) line(` * @deprecated ${state.deprecated.trim()}`, 'tag');
  state.see.filter(s=>s.trim()).forEach(s=>line(` * @see     ${s.trim()}`, 'tag'));

  comment(' */');
  return out;
}

/* ── Render output ──────────────────────────────────────────────────────── */
function renderOutput() {
  const pre = document.getElementById('output'); pre.innerHTML='';
  generate().forEach(({text,kind}) => {
    const div = document.createElement('div');
    if (kind==='blank') {
      div.innerHTML='&nbsp;';
    } else if (kind==='pkg') {
      const name = escHtml(text.replace('package ','').replace(';',''));
      div.innerHTML=`<span class="c-kw">package</span> <span class="c-pkg">${name}</span><span class="c-deco">;</span>`;
    } else if (kind==='imp') {
      const full=text.replace('import ','').replace(';','');
      const dot=full.lastIndexOf('.');
      const pre2=dot>=0?escHtml(full.slice(0,dot+1)):'';
      const cls =escHtml(dot>=0?full.slice(dot+1):full);
      div.innerHTML=`<span class="c-kw">import</span> <span class="c-deco">${pre2}</span><span class="c-imp">${cls}</span><span class="c-deco">;</span>`;
    } else if (kind==='tag') {
      const m=text.match(/^( \* )(@\w+)(.*)?$/);
      if (m) div.innerHTML=`<span class="c-deco">${m[1]}</span><span class="c-tag">${m[2]}</span><span class="c-val">${escHtml(m[3]||'')}</span>`;
      else div.innerHTML=`<span class="c-deco">${escHtml(text)}</span>`;
    } else {
      div.innerHTML=`<span class="c-deco">${escHtml(text)}</span>`;
    }
    pre.appendChild(div);
  });
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function copyOutput() {
  const text = generate().map(l=>l.text).join('\n');
  navigator.clipboard.writeText(text).then(()=>{
    const btn=document.getElementById('copy-btn');
    btn.textContent='Copied!'; btn.classList.add('copied');
    setTimeout(()=>{ btn.textContent='Copy'; btn.classList.remove('copied'); },1800);
  });
}

renderForm();
renderOutput();
