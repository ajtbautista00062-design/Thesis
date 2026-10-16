import { useState } from 'react'
import { useLocalAi } from './llm/useLocalAi'
import Ask from './llm/AskChat'

type Page = 'Dashboard' | 'Ask Cemetery' | 'Deceased Records' | 'Burial Plots' | 'Map' | 'Capacity' | 'Renewal & Review' | 'Reports' | 'Settings'
type Cemetery = { id: string; name: string; dataset: string }

const cemeteries: Cemetery[] = [
  { id: 'cemetery-01', name: 'Cemetery 01', dataset: 'Survey data set 01' },
  { id: 'cemetery-02', name: 'Cemetery 02', dataset: 'Survey data set 02' },
  { id: 'cemetery-03', name: 'Cemetery 03', dataset: 'Survey data set 03' },
]

const nav: { label: Page; icon: string }[] = [
  { label: 'Dashboard', icon: '▦' }, { label: 'Ask Cemetery', icon: '◌' }, { label: 'Deceased Records', icon: '▤' },
  { label: 'Burial Plots', icon: '▧' }, { label: 'Map', icon: '⌖' }, { label: 'Capacity', icon: '◫' },
  { label: 'Renewal & Review', icon: '✓' }, { label: 'Reports', icon: '▱' }, { label: 'Settings', icon: '⚙' },
]

function Status({ children }: { children: string }) {
  const tone = children === 'Verified' || children === 'Occupied' || children === 'Current' || children === 'Available' ? 'green' : children === 'Vacant' ? 'teal' : children === 'Reserved' ? 'amber' : 'slate'
  return <span className={`status ${tone}`}>{children}</span>
}

function Mark() { return <div className="mark"><span>✦</span></div> }

export default function App() {
  const [page, setPage] = useState<Page>('Dashboard')
  const [collapsed, setCollapsed] = useState(false)
  const [query, setQuery] = useState('')
  const { result, serviceMessage, ask, reset } = useLocalAi()
  const [cemetery, setCemetery] = useState<Cemetery>(cemeteries[0])
  const [cemeteryMenu, setCemeteryMenu] = useState(false)
  const runQuery = (text = query) => { if (result.busy) return; if (text.trim()) setQuery(''); setPage('Ask Cemetery'); void ask(text) }
  return <div className={`app-shell ${collapsed ? 'is-collapsed' : ''}`}>
    <aside className="sidebar">
      <div className="brand"><Mark /><div><b>Cemetery GeoAI</b><small>LOCAL INFORMATION SYSTEM</small></div></div>
      <div className="registry-nav"><span>ACTIVE REGISTRY</span><button onClick={() => setCemeteryMenu(!cemeteryMenu)}><i>▣</i><b>{cemetery.name}</b><small>{cemetery.dataset}</small><em>⌄</em></button></div>
      <button className="new-query" onClick={() => { setPage('Ask Cemetery'); reset(); setQuery('') }}><span>＋</span> New chat</button>
      <nav>{nav.map(item => <button key={item.label} onClick={() => setPage(item.label)} className={page === item.label ? 'active' : ''}><i>{item.icon}</i><span>{item.label}</span></button>)}</nav>
      <div className="side-status"><div className="online-dot"/><div><b>Offline Mode</b><small>Local Database Connected</small></div></div>
    </aside>
    <main>
      <header className="topbar">
        <button className="menu" onClick={() => setCollapsed(!collapsed)} aria-label="Toggle navigation">☰</button>
        <div className="page-heading"><span>LOCAL CEMETERY REGISTRY</span><h1>{page === 'Dashboard' ? 'Cemetery Information System' : page}</h1></div>
        <div className="cemetery-switcher"><button onClick={() => setCemeteryMenu(!cemeteryMenu)}><span>ACTIVE CEMETERY</span><b>{cemetery.name}</b><i>⌄</i></button>{cemeteryMenu && <div className="cemetery-menu">{cemeteries.map(item => <button key={item.id} className={item.id === cemetery.id ? 'selected' : ''} onClick={() => { setCemetery(item); setCemeteryMenu(false); reset() }}><i>▣</i><span><b>{item.name}</b><small>{item.dataset} · separate registry</small></span>{item.id === cemetery.id && <em>✓</em>}</button>)}</div>}</div>
        <div className="top-actions"><button className="search">⌕</button><span className="db-status"><i className="online-dot"/> Database connected</span><span className="offline-badge">OFFLINE</span><div className="avatar">AM</div></div>
      </header>
      <section className="content"><CemeteryContext cemetery={cemetery}/>{page === 'Dashboard' && <Dashboard runQuery={runQuery} cemetery={cemetery}/>} {page === 'Ask Cemetery' && <Ask newChat={() => { reset(); setQuery('') }} query={query} result={result} serviceMessage={serviceMessage} setQuery={setQuery} runQuery={runQuery} cemetery={cemetery}/>} {page === 'Deceased Records' && <RecordDetails setPage={setPage} cemetery={cemetery}/>} {page === 'Burial Plots' && <Plots cemetery={cemetery}/>} {page === 'Map' && <MapView cemetery={cemetery}/>} {page === 'Capacity' && <Capacity cemetery={cemetery}/>} {page === 'Renewal & Review' && <Review cemetery={cemetery}/>} {page === 'Reports' && <Reports cemetery={cemetery}/>} {page === 'Settings' && <Settings cemetery={cemetery}/>}</section>
    </main>
  </div>
}

function CemeteryContext({ cemetery }: { cemetery: Cemetery }) { return <div className="cemetery-context"><i>▣</i><span><b>{cemetery.name}</b><small>{cemetery.dataset} · Active local registry</small></span><em>Records, plot inventory, GIS map, capacity, and reports are kept separate from the other cemetery data sets.</em></div> }
function Dashboard({ runQuery, cemetery }: { runQuery: (q?: string) => void; cemetery: Cemetery }) { const [question, setQuestion] = useState(''); return <>
  <div className="overview-heading"><div><p className="eyebrow">OVERVIEW · {cemetery.name.toUpperCase()}</p><h2>Cemetery Information System</h2><p className="muted">A verified view of local cemetery records, plot status, and required follow-up.</p></div><div className="verified-at">Last database verification<br/><b>Not yet verified</b></div></div>
  <div className="stats"><Stat n="—" label="Total deceased records" note="Awaiting local data"/><Stat n="—" label="Occupied plots" note="Awaiting plot inventory"/><Stat n="—" label="Available plots" note="Awaiting verification"/><Stat n="—" label="Records for review" note="No review data loaded"/></div>
  <section className="ask-panel"><div className="ask-title"><span className="section-kicker">LOCAL AI ASSISTANT</span><h2>Ask about the cemetery</h2><p>Chat about cemetery land information, records, mapping, and planning.</p></div><div className="query-box"><input value={question} onChange={e => setQuestion(e.target.value)} placeholder="Ask about cemetery land information..." onKeyDown={e => { if (e.key === 'Enter') runQuery(question) }}/><button className="mic" aria-label="Microphone (visual only)">♩</button><button className="ask-button" onClick={() => runQuery(question)}>Start conversation →</button></div><div className="sample-answer empty-response"><div className="answer-label"><Mark/><span>CONVERSATION</span></div><p>Start a conversation about cemetery land management, mapping, or information systems. Verified cemetery records are not connected yet.</p></div></section>
  <div className="two-col"><section className="panel"><PanelHead title="Recent queries" action="View query history"/><div className="empty-table">No local query history is available yet.</div></section><section className="panel quick"><PanelHead title="Quick access"/><div className="quick-grid">{[['⌕','Search Deceased'],['⌖','Find Plot'],['▧','View Vacant Plots'],['✓','Review Expiring Records'],['◫','View Capacity'],['▱','Open Cemetery Map']].map(x => <button key={x[1]}><i>{x[0]}</i>{x[1]}<span>→</span></button>)}</div></section></div>
</> }
function Stat({ n, label, note, alert }: {n:string;label:string;note:string;alert?:boolean}) { return <div className={`stat ${alert ? 'alert' : ''}`}><p>{label}</p><strong>{n}</strong><small>{note}</small></div> }
function PanelHead({ title, action }: {title:string;action?:string}) { return <div className="panel-head"><h3>{title}</h3>{action && <button>{action} →</button>}</div> }

function RecordDetails({ setPage, cemetery }: {setPage:(p:Page)=>void;cemetery:Cemetery}) { return <><div className="crumb">{cemetery.name.toUpperCase()} / DECEASED RECORDS</div><div className="record-header"><div><p className="eyebrow">RECORD DETAILS</p><h2>No record selected</h2><p className="muted">Search the {cemetery.name} registry to open a deceased-person record.</p></div></div><div className="detail-layout"><section className="panel details"><PanelHead title="Record details"/><div className="empty-table">No deceased record is currently selected.</div></section><section className="panel location"><PanelHead title="Burial location"/><MapGraphic/><p><b>No plot selected</b><br/><span>Select a verified record to see its existing GIS location.</span></p><button className="outline" onClick={()=>setPage('Map')}>Open Cemetery Map →</button><small>Map is an existing GIS visualization; it is not created or interpreted by the language model.</small></section></div></> }

function Plots({ cemetery }: {cemetery:Cemetery}) { return <><div className="overview-heading"><div><p className="eyebrow">PLOT INVENTORY · {cemetery.name.toUpperCase()}</p><h2>Burial plots</h2><p className="muted">Mapped plot inventory and current administrative conditions.</p></div><button className="outline">Export register</button></div><section className="panel plot-panel"><div className="table-tools"><b>All plots · {cemetery.name}</b><input placeholder="Search plot or occupant"/><button className="outline">Filter ▾</button></div><table className="data-table"><thead><tr>{['Plot ID','Section','Status','Occupant','Administrative status','Serviceability','Review flag','Last verified'].map(x=><th key={x}>{x}</th>)}</tr></thead></table><div className="empty-table">No plot inventory has been loaded for {cemetery.name}.</div><div className="table-note">Potential reuse is a review condition only. It must not be treated as vacant or immediately available.</div></section></> }

function MapGraphic() { return <div className="map-graphic empty-map"><div className="road r1"/><div className="road r2"/><span>No cemetery map has been imported</span></div> }
function MapView({ cemetery }: {cemetery:Cemetery}) { return <div className="map-page"><div className="map-toolbar"><input placeholder={`Search ${cemetery.name} plot`}/><button>−</button><button>+</button></div><MapGraphic/><aside className="map-info"><span className="section-kicker">{cemetery.name.toUpperCase()} · SELECTED PLOT</span><h2>No plot selected</h2><p className="muted">Import or connect the {cemetery.name} GIS layer to view plot information.</p><div className="legend"><b>MAP LEGEND</b><span><i className="l occupied"/> Occupied</span><span><i className="l vacant"/> Vacant</span><span><i className="l review"/> Review condition</span><span><i className="l path"/> Road / pathway</span></div></aside><p className="map-caption">{cemetery.name} GIS reference · Plot boundaries and site features are shown for visual reference.</p></div> }

function Capacity({ cemetery }: {cemetery:Cemetery}) { return <><div className="overview-heading"><div><p className="eyebrow">SPACE INVENTORY · {cemetery.name.toUpperCase()}</p><h2>Capacity</h2><p className="muted">No verified slot inventory has been loaded for this cemetery.</p></div><span className="offline-badge">LOCAL DATABASE</span></div><div className="capacity-layout"><section className="panel capacity-chart"><PanelHead title={`Burial-space capacity · ${cemetery.name}`}/><div className="donut empty-donut"><div><b>—</b><span>No mapped slots</span></div></div><div className="chart-key"><span><i className="k k1"/>Occupied <b>—</b></span><span><i className="k k2"/>Immediately available <b>—</b></span><span><i className="k k3"/>Reserved <b>—</b></span><span><i className="k k4"/>Under review <b>—</b></span><span><i className="k k5"/>Authorized reusable <b>—</b></span></div></section><section className="capacity-cards"><Stat n="—" label="Immediately Available" note="No verified plot data"/><Stat n="—" label="Under Review" note="No review data loaded"/><Stat n="—" label="Potential Reuse" note="Requires explicit authorization"/><Stat n="—" label="Unavailable" note="No inventory data loaded"/></section></div><div className="notice">ⓘ An expired record does not automatically make a plot reusable. Availability remains subject to documented authorization and cemetery policy.</div></> }
function Review({ cemetery }: {cemetery:Cemetery}) { return <><div className="overview-heading"><div><p className="eyebrow">RECORDS MANAGEMENT · {cemetery.name.toUpperCase()}</p><h2>Renewal & review</h2><p className="muted">Items requiring administrative attention; no action is automated.</p></div><button className="outline">Export action list</button></div><section className="panel"><table className="data-table"><thead><tr>{['Deceased / Record','Plot ID','Renewal date','Review reason','Status','Required action'].map(x=><th key={x}>{x}</th>)}</tr></thead></table><div className="empty-table">No {cemetery.name} records currently require renewal or review.</div></section></> }
function Reports({ cemetery }: {cemetery:Cemetery}) { return <div className="reports"><p className="eyebrow">LOCAL REPORTING · {cemetery.name.toUpperCase()}</p><h2>Reports</h2><p className="muted">Generate administrative views from the selected cemetery only.</p><div className="report-grid">{['Deceased record register','Plot occupancy summary','Capacity status report','Renewal and review register'].map(x=><button key={x}><i>▱</i><b>{x}</b><span>Prepare {cemetery.name} report →</span></button>)}</div></div> }
function Settings({ cemetery }: {cemetery:Cemetery}) { return <><div className="overview-heading"><div><p className="eyebrow">SYSTEM STATUS · {cemetery.name.toUpperCase()}</p><h2>Local & offline operation</h2><p className="muted">Cemetery GeoAI functions without an internet connection.</p></div><Status>Verified</Status></div><section className="panel system"><PanelHead title="System information"/><div>{[['Active registry',cemetery.name],['Data set',cemetery.dataset],['System mode','Offline'],['LLM','Qwen2.5-3B-Instruct'],['LLM runtime','Local'],['Database','Local Cemetery Database'],['Internet connection','Not required'],['Database status','Connected'],['Last database verification','Not yet verified'],['Storage status','Not available'],['Application version','Cemetery GeoAI thesis prototype']].map(x=><div key={x[0]}><span>{x[0]}</span><b>{x[1]}</b></div>)}</div></section><div className="notice">ⓘ The local language model interprets questions and explains retrieved records. It does not generate maps, make plot-reuse decisions, or determine regulatory compliance.</div></> }
