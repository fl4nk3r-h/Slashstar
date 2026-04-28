/* ── State ─────────────────────────────────────────────────────────────── */
const TYPES = ['Class','Interface','Enum','Method','Constructor','Field'];
let currentType = 'Class';

const DOC_PROFILES = {
  neutral: {
    label: 'Strict standard Javadoc',
    description: 'Recommended profile. Keeps the output close to the Javadoc spec with neutral formatting and predictable tag order.',
    showPackageAndImports: true,
    showClassIdentity: true,
    showMethodIdentity: true,
    showAuthor: true,
    showVersion: true,
    showSince: true,
    showDeprecated: true,
    showSee: true,
    autoOpenSource: false,
  },
  oracle: {
    label: 'Oracle / OpenJDK-like',
    description: 'Matches the style commonly seen in Oracle/OpenJDK sources with explicit metadata tags and conservative alignment.',
    showPackageAndImports: true,
    showClassIdentity: true,
    showMethodIdentity: true,
    showAuthor: true,
    showVersion: true,
    showSince: true,
    showDeprecated: true,
    showSee: true,
    autoOpenSource: false,
  },
  google: {
    label: 'Google Java Style-like',
    description: 'Keeps docs short and direct. Omits author/version metadata and focuses on concise summaries plus essential tags.',
    showPackageAndImports: true,
    showClassIdentity: false,
    showMethodIdentity: false,
    showAuthor: false,
    showVersion: false,
    showSince: false,
    showDeprecated: true,
    showSee: true,
    autoOpenSource: false,
  },
  openSource: {
    label: 'Open Source Project preset',
    description: 'A practical preset for OSS projects. Starts with a license header and the neutral Javadoc profile so generated code is publication-ready.',
    showPackageAndImports: true,
    showClassIdentity: true,
    showMethodIdentity: true,
    showAuthor: true,
    showVersion: true,
    showSince: true,
    showDeprecated: true,
    showSee: true,
    autoOpenSource: true,
  },
};

const DOC_PROFILE_ORDER = ['neutral', 'oracle', 'google', 'openSource'];
let currentProfile = 'neutral';

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
const activeProfile = () => DOC_PROFILES[currentProfile] || DOC_PROFILES.neutral;

function syncProfileDefaults(profileId) {
  currentProfile = profileId;
  const profile = activeProfile();

  if (profile.autoOpenSource) {
    state.hasCopyright = true;
    if (!state.copyrightHolder.trim()) state.copyrightHolder = 'Open Source Contributors';
    if (state.license === 'none') state.license = 'apache2';
  }
}

function normalizeSentence(text) {
  const value = text.trim();
  if (!value) return '';
  return /[.!?]$/.test(value) ? value : `${value}.`;
}

function appendLine(out, text, kind) {
  out[out.length] = { text, kind };
}

function formatDescription(text) {
  return text
    .trim()
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => normalizeSentence(line));
}

function appendCopyrightBlock(out, state) {
  if (!state.hasCopyright) return;
  const holder = state.copyrightHolder.trim() || 'The Author';
  const sy = state.copyrightStartYear.trim();
  const ey = state.copyrightEndYear.trim();
  const yr = (sy && ey && sy !== ey) ? `${sy}, ${ey}` : (ey || sy || new Date().getFullYear());

  appendLine(out, '/*', 'comment');
  appendLine(out, ` * Copyright (c) ${yr}, ${holder}. All rights reserved.`, 'comment');

  let licenseTemplate = LICENSE_TEMPLATES[state.license];
  if (state.license === 'custom') {
    licenseTemplate = state.customLicense.trim() ? state.customLicense.trim().split('\n').map(line => ` * ${line}`) : null;
  }

  if (licenseTemplate) {
    appendLine(out, ' *', 'comment');
    licenseTemplate.forEach(line => appendLine(out, line, 'comment'));
  }

  appendLine(out, ' */', 'comment');
  appendLine(out, '', 'blank');
}

function appendPackageAndImports(out, state, profile) {
  if (profile.showPackageAndImports && state.hasPackage && state.packageName.trim()) {
    appendLine(out, `package ${state.packageName.trim()};`, 'pkg');
    appendLine(out, '', 'blank');
  }

  const validImports = state.imports.filter(item => item.trim());
  if (profile.showPackageAndImports && validImports.length) {
    validImports.forEach(item => appendLine(out, `import ${item.trim()};`, 'imp'));
    appendLine(out, '', 'blank');
  }
}

function appendDescription(out, state) {
  if (!state.desc.trim()) return;
  formatDescription(state.desc).forEach(line => appendLine(out, ` * ${line}`, 'comment'));
  appendLine(out, ' *', 'comment');
}

function appendClassTags(out, state, currentType, profile) {
  if (!isClass(currentType)) return;

  state.typeParams.filter(param => param.name.trim() || param.desc.trim()).forEach(param => {
    const paramDescription = param.desc.trim();
    const suffix = paramDescription ? ` ${paramDescription}` : '';
    appendLine(out, ` * @param ${param.name.trim() || '<T>'}${suffix}`, 'tag');
  });

  if (profile.showAuthor && state.author.trim()) {
    state.author.split(',').map(author => author.trim()).filter(Boolean).forEach(author => {
      appendLine(out, ` * @author ${author}`, 'tag');
    });
  }

  if (profile.showVersion && state.version.trim()) {
    appendLine(out, ` * @version ${state.version.trim()}`, 'tag');
  }
}

function appendMethodTags(out, state, currentType, profile) {
  if (!isMethod(currentType)) return;

  if (profile.showAuthor && state.author.trim()) {
    appendLine(out, ` * @author ${state.author.trim()}`, 'tag');
  }

  if (profile.showSince && state.since.trim()) {
    appendLine(out, ` * @since ${state.since.trim()}`, 'tag');
  }

  state.params.filter(param => param.name.trim() || param.desc.trim()).forEach(param => {
    const typePrefix = param.ptype.trim() ? `(${param.ptype.trim()}) ` : '';
    const paramDescription = param.desc.trim();
    const suffix = paramDescription ? ` ${paramDescription}` : '';
    appendLine(out, ` * @param ${typePrefix}${param.name.trim() || 'param'}${suffix}`, 'tag');
  });

  if (currentType === 'Method' && (state.returns.rtype.trim() || state.returns.desc.trim())) {
    const returnType = state.returns.rtype.trim() ? `{${state.returns.rtype.trim()}} ` : '';
    appendLine(out, ` * @return ${returnType}${state.returns.desc.trim()}`, 'tag');
  }

  state.throws.filter(error => error.etype.trim() || error.desc.trim()).forEach(error => {
    const errorDescription = error.desc.trim();
    const suffix = errorDescription ? ` ${errorDescription}` : '';
    appendLine(out, ` * @throws ${error.etype.trim() || 'Exception'}${suffix}`, 'tag');
  });
}

function appendFooterTags(out, state, profile) {
  if (profile.showDeprecated && state.deprecated.trim()) {
    appendLine(out, ` * @deprecated ${state.deprecated.trim()}`, 'tag');
  }

  if (profile.showSee) {
    state.see.filter(ref => ref.trim()).forEach(ref => {
      appendLine(out, ` * @see ${ref.trim()}`, 'tag');
    });
  }
}

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
  const g=el('div',{className:'field-group'});
  if (lbl) {
    g.appendChild(mkLabel(lbl));
  }
  g.appendChild(inp);
  return g;
}
function mkSelect(opts,val,cb) {
  const s=el('select'); s.onchange=cb;
  opts.forEach(([v,t]) => {
    const o=el('option',{value:v},t);
    if (v===val) {
      o.selected=true;
    }
    s.appendChild(o);
  });
  return s;
}
function subTitle(txt) { return el('div',{className:'sub-title'},txt); }
function rmBtn(cb)  { const b=el('button',{className:'remove-btn'},'×'); b.onclick=cb; return b; }
function addBtn(txt,cb) { const b=el('button',{className:'add-btn'},txt); b.onclick=cb; return b; }

function getNameLabel(type) {
  if (type === 'Field') return 'Field Name';
  if (type === 'Method') return 'Method Name';
  if (type === 'Constructor') return 'Class Name';
  return `${type} Name`;
}

function getNamePlaceholder(type) {
  if (type === 'Method') return 'calculateTotal';
  if (type === 'Field') return 'MAX_SIZE';
  return 'MyClass';
}

function createPackageImportsSection(profile) {
  return section('Package & Imports', profile.showPackageAndImports ? 'optional' : 'hidden', state.hasPackage || state.imports.some(item => item.trim()), body => {
    const pkgWrap = el('div');
    pkgWrap.style.display = state.hasPackage ? 'block' : 'none';
    pkgWrap.appendChild(fg('Package Name', mkInput('com.example.mypackage', state.packageName, e => { state.packageName = e.target.value; renderOutput(); })));

    const packageToggle = el('input', { type: 'checkbox', id: 'chk-pkg' });
    packageToggle.checked = state.hasPackage;
    const packageLabel = el('label', { htmlFor: 'chk-pkg' }, 'Include package declaration');
    packageToggle.onchange = e => {
      state.hasPackage = e.target.checked;
      pkgWrap.style.display = e.target.checked ? 'block' : 'none';
      renderOutput();
    };

    body.appendChild(el('div', { className: 'check-row' }, packageToggle, packageLabel));
    body.appendChild(pkgWrap);

    body.appendChild(subTitle('Imports'));
    const importList = el('div');

    function renderImports() {
      importList.innerHTML = '';
      for (let i = 0; i < state.imports.length; i += 1) {
        const importValue = state.imports[i];
        const row = el('div', { className: 'dyn-row' });
        const input = mkInput('java.util.List', importValue, e => {
          state.imports[i] = e.target.value;
          renderOutput();
        });
        row.append(input, rmBtn(() => {
          state.imports.splice(i, 1);
          renderImports();
          renderOutput();
        }));
        importList.appendChild(row);
      }
    }

    renderImports();
    body.appendChild(importList);
    body.appendChild(addBtn('+ add import', () => { state.imports.push(''); renderImports(); renderOutput(); }));
  });
}

function createTypeParamsSection() {
  return section('@param <T> — Generic Type Parameters', 'optional', false, body => {
    const list = el('div');

    function renderTypeParams() {
      list.innerHTML = '';
      for (let i = 0; i < state.typeParams.length; i += 1) {
        const param = state.typeParams[i];
        const row = el('div', { className: 'dyn-row' });
        const nameInput = mkInput('<E>', param.name, e => {
          state.typeParams[i].name = e.target.value;
          renderOutput();
        });
        nameInput.style.maxWidth = '80px';
        const descInput = mkInput('the type of elements in this list', param.desc, e => {
          state.typeParams[i].desc = e.target.value;
          renderOutput();
        });
        row.append(nameInput, descInput, rmBtn(() => {
          state.typeParams.splice(i, 1);
          renderTypeParams();
          renderOutput();
        }));
        list.appendChild(row);
      }
    }

    renderTypeParams();
    body.appendChild(list);
    body.appendChild(addBtn('+ add type param', () => { state.typeParams.push({ name: '', desc: '' }); renderTypeParams(); renderOutput(); }));
  });
}

function createMethodParamsSection() {
  return section('@param — Parameters', '', true, body => {
    const list = el('div');

    function renderParams() {
      list.innerHTML = '';
      for (let i = 0; i < state.params.length; i += 1) {
        const param = state.params[i];
        const row = el('div', { className: 'dyn-row' });
        const typeInput = mkInput('Type', param.ptype, e => {
          state.params[i].ptype = e.target.value;
          renderOutput();
        });
        const nameInput = mkInput('name', param.name, e => {
          state.params[i].name = e.target.value;
          renderOutput();
        });
        const descInput = mkInput('description', param.desc, e => {
          state.params[i].desc = e.target.value;
          renderOutput();
        });
        row.append(typeInput, nameInput, descInput, rmBtn(() => {
          state.params.splice(i, 1);
          renderParams();
          renderOutput();
        }));
        list.appendChild(row);
      }
    }

    renderParams();
    body.appendChild(list);
    body.appendChild(addBtn('+ add parameter', () => { state.params.push({ ptype: '', name: '', desc: '' }); renderParams(); renderOutput(); }));
  });
}

function createThrowsSection() {
  return section('@throws — Exceptions', 'optional', false, body => {
    const list = el('div');

    function renderThrows() {
      list.innerHTML = '';
      for (let i = 0; i < state.throws.length; i += 1) {
        const thrown = state.throws[i];
        const row = el('div', { className: 'dyn-row' });
        const typeInput = mkInput('ExceptionType', thrown.etype, e => {
          state.throws[i].etype = e.target.value;
          renderOutput();
        });
        const descInput = mkInput('when thrown', thrown.desc, e => {
          state.throws[i].desc = e.target.value;
          renderOutput();
        });
        row.append(typeInput, descInput, rmBtn(() => {
          state.throws.splice(i, 1);
          renderThrows();
          renderOutput();
        }));
        list.appendChild(row);
      }
    }

    renderThrows();
    body.appendChild(list);
    body.appendChild(addBtn('+ add throws', () => { state.throws.push({ etype: '', desc: '' }); renderThrows(); renderOutput(); }));
  });
}

function createSeeSection() {
  return section('@see — Cross References', 'optional', false, body => {
    const list = el('div');

    function renderSee() {
      list.innerHTML = '';
      for (let i = 0; i < state.see.length; i += 1) {
        const seeRef = state.see[i];
        const row = el('div', { className: 'dyn-row' });
        const input = mkInput('Collection', seeRef, e => {
          state.see[i] = e.target.value;
          renderOutput();
        });
        row.append(input, rmBtn(() => {
          state.see.splice(i, 1);
          renderSee();
          renderOutput();
        }));
        list.appendChild(row);
      }
    }

    renderSee();
    body.appendChild(list);
    body.appendChild(addBtn('+ add @see', () => { state.see.push(''); renderSee(); renderOutput(); }));
  });
}

const profileSelect = document.getElementById('profile-select');
const profileHint = document.getElementById('profile-hint');
DOC_PROFILE_ORDER.forEach(profileId => {
  const profile = DOC_PROFILES[profileId];
  const option = el('option', { value: profileId }, profile.label);
  if (profileId === currentProfile) option.selected = true;
  profileSelect.appendChild(option);
});
profileHint.textContent = activeProfile().description;
profileSelect.onchange = e => {
  syncProfileDefaults(e.target.value);
  profileHint.textContent = activeProfile().description;
  renderForm();
  renderOutput();
};

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
  const profile = activeProfile();

  /* 1 ── Copyright / File Header */
  f.appendChild(section('Copyright / File Header', profile.autoOpenSource ? 'open source' : 'optional', state.hasCopyright || profile.autoOpenSource, body => {
    const inner = el('div');
    const cb = el('input',{type:'checkbox',id:'chk-copy'}); cb.checked=state.hasCopyright;
    const cbl = el('label',{htmlFor:'chk-copy'},'Include copyright header in output');
    body.appendChild(el('div',{className:'check-row'},cb,cbl));
    if (profile.autoOpenSource) {
      state.hasCopyright = true;
      cb.checked = true;
      cb.disabled = true;
    }
    cb.onchange = e => { state.hasCopyright=e.target.checked; inner.style.display=e.target.checked?'block':'none'; renderOutput(); };
    inner.style.display = state.hasCopyright?'block':'none';
    if (profile.autoOpenSource) inner.style.display = 'block';

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
    if (profile.autoOpenSource && state.license === 'none') {
      state.license = 'apache2';
      licSel.value = 'apache2';
    }
    inner.appendChild(fg('License', licSel));

    const customWrap = el('div',{style:'margin-top:6px;'}); customWrap.style.display=state.license==='custom'?'block':'none';
    const cta = mkTextarea(4,'Paste your custom license lines here...', state.customLicense, e=>{ state.customLicense=e.target.value; renderOutput(); });
    customWrap.appendChild(cta); inner.appendChild(customWrap);
    body.appendChild(inner);
  }));

  /* 2 ── Package & Imports */
  f.appendChild(createPackageImportsSection(profile));

  /* 3 ── Name & Description */
  f.appendChild(section('Name & Description', '', true, body => {
    const nameLbl = getNameLabel(currentType);
    const namePH = getNamePlaceholder(currentType);
    body.appendChild(fg(nameLbl, mkInput(namePH, state.name, e=>{ state.name=e.target.value; renderOutput(); })));

    const dTA = mkTextarea(4, 'Describe the purpose and behaviour.\nSupports {@code X}, {@link Y#m()}, <p>, <strong> etc.', state.desc, e=>{ state.desc=e.target.value; renderOutput(); });
    body.appendChild(tagHints(dTA));
    body.appendChild(fg('Description', dTA));
  }));

  /* 4 ── Class-level: Author, Version, Since, Generic type params */
  if (isClass(currentType) && profile.showClassIdentity) {
    f.appendChild(section('Author, Version & Since', '', true, body => {
      body.appendChild(fg('Author(s) — comma-separated', mkInput('John Doe, Alex Smith', state.author, e=>{ state.author=e.target.value; renderOutput(); })));
      const vc=el('div',{className:'two-col'});
      vc.appendChild(fg('Version', mkInput('1.0.0', state.version, e=>{ state.version=e.target.value; renderOutput(); })));
      vc.appendChild(fg('Since',   mkInput('1.2',   state.since,   e=>{ state.since=e.target.value;   renderOutput(); })));
      body.appendChild(vc);
    }));

    f.appendChild(createTypeParamsSection());
  }

  /* 5 ── Method-level: since/author, params, returns, throws */
  if (isMethod(currentType)) {
    if (profile.showMethodIdentity) {
      f.appendChild(section('Since & Author', 'optional', false, body => {
        const vc=el('div',{className:'two-col'});
        vc.appendChild(fg('Since',  mkInput('1.0', state.since,  e=>{ state.since=e.target.value;  renderOutput(); })));
        vc.appendChild(fg('Author', mkInput('',    state.author, e=>{ state.author=e.target.value; renderOutput(); })));
        body.appendChild(vc);
      }));
    }

    f.appendChild(createMethodParamsSection());

    if (currentType==='Method') {
      f.appendChild(section('@return — Return Value', '', true, body => {
        const row=el('div',{className:'dyn-row'});
        row.appendChild(mkInput('Return type', state.returns.rtype, e=>{ state.returns.rtype=e.target.value; renderOutput(); }));
        row.appendChild(mkInput('What is returned', state.returns.desc, e=>{ state.returns.desc=e.target.value; renderOutput(); }));
        body.appendChild(row);
      }));
    }

    f.appendChild(createThrowsSection());
  }

  if (currentType==='Field') {
    f.appendChild(section('Since', 'optional', false, body => {
      body.appendChild(fg('Since', mkInput('1.0', state.since, e=>{ state.since=e.target.value; renderOutput(); })));
    }));
  }

  /* 6 ── Deprecated */
  if (profile.showDeprecated) {
    f.appendChild(section('@deprecated', 'optional', !!state.deprecated, body => {
      body.appendChild(fg('', mkInput('Use {@link NewClass} instead', state.deprecated, e=>{ state.deprecated=e.target.value; renderOutput(); })));
    }));
  }

  /* 7 ── @see */
  if (profile.showSee) {
    f.appendChild(createSeeSection());
  }
}

/* ── Generate output lines ─────────────────────────────────────────────── */
function generate() {
  const profile = activeProfile();
  const out = [];
  appendCopyrightBlock(out, state);
  appendPackageAndImports(out, state, profile);
  appendLine(out, '/**', 'comment');
  appendDescription(out, state);
  appendClassTags(out, state, currentType, profile);
  if (profile.showSince && (isClass(currentType) || currentType === 'Field') && state.since.trim()) {
    appendLine(out, ` * @since ${state.since.trim()}`, 'tag');
  }
  appendMethodTags(out, state, currentType, profile);
  appendFooterTags(out, state, profile);
  appendLine(out, ' */', 'comment');
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
      const m=/^ \* (@\w+)(.*)$/.exec(text);
      if (m) div.innerHTML=`<span class="c-deco"> * </span><span class="c-tag">${m[1]}</span><span class="c-val">${escHtml(m[2]||'')}</span>`;
      else div.innerHTML=`<span class="c-deco">${escHtml(text)}</span>`;
    } else {
      div.innerHTML=`<span class="c-deco">${escHtml(text)}</span>`;
    }
    pre.appendChild(div);
  });
}

function escHtml(s) {
  return String(s)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;');
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
