import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { ARTICLES } from '../data/articles.js'
import { A, SURFACE, BORDER, FG, MUTED, BG, A06 } from '../lib/theme.js'
import { useTheme } from '../context/ThemeContext.jsx'

function renderMarkdown(text) {
  if (!text) return null
  const lines = text.split('\n')
  const elements = []
  let i = 0

  function inlineFormat(str) {
    // Bold **text**
    const parts = str.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/)
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={idx}>{part.slice(2, -2)}</strong>
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={idx}>{part.slice(1, -1)}</em>
      }
      return part
    })
  }

  while (i < lines.length) {
    const line = lines[i]

    // H1
    if (line.startsWith('# ') && !line.startsWith('## ')) {
      elements.push(
        <h1 key={i} style={{ fontSize: 28, fontWeight: 600, color: FG, letterSpacing: '-0.03em', marginTop: 0, marginBottom: 12, lineHeight: 1.3 }}>
          {inlineFormat(line.slice(2))}
        </h1>
      )
      i++; continue
    }

    // H2
    if (line.startsWith('## ') && !line.startsWith('### ')) {
      elements.push(
        <h2 key={i} style={{ fontSize: 20, fontWeight: 600, color: FG, letterSpacing: '-0.02em', marginTop: 36, marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${BORDER}` }}>
          {inlineFormat(line.slice(3))}
        </h2>
      )
      i++; continue
    }

    // H3
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} style={{ fontSize: 15, fontWeight: 600, color: FG, letterSpacing: '-0.01em', marginTop: 24, marginBottom: 8 }}>
          {inlineFormat(line.slice(4))}
        </h3>
      )
      i++; continue
    }

    // HR
    if (line.trim() === '---') {
      elements.push(<hr key={i} style={{ border: 'none', borderTop: `1px solid ${BORDER}`, margin: '28px 0' }} />)
      i++; continue
    }

    // Table
    if (line.startsWith('|')) {
      const tableLines = []
      while (i < lines.length && lines[i].startsWith('|')) {
        if (!lines[i].match(/^\|[-| ]+\|$/)) {
          tableLines.push(lines[i])
        }
        i++
      }
      elements.push(
        <div key={`table-${i}`} style={{ overflowX: 'auto', marginBottom: 20 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <tbody>
              {tableLines.map((tl, ri) => (
                <tr key={ri} style={{ background: ri === 0 ? A06 : ri % 2 === 0 ? `${BORDER}30` : 'transparent' }}>
                  {tl.split('|').filter((_, ci) => ci > 0 && ci < tl.split('|').length - 1).map((cell, ci) => (
                    <td key={ci} style={{
                      padding: '8px 12px',
                      borderBottom: `1px solid ${BORDER}`,
                      color: ri === 0 ? FG : MUTED,
                      fontWeight: ri === 0 ? 600 : 400,
                      fontFamily: ri === 0 ? "'Space Mono', monospace" : 'inherit',
                      fontSize: ri === 0 ? 11 : 13,
                    }}>
                      {inlineFormat(cell.trim())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      continue
    }

    // Bullet list
    if (line.startsWith('- ')) {
      const items = []
      while (i < lines.length && lines[i].startsWith('- ')) {
        items.push(lines[i].slice(2))
        i++
      }
      elements.push(
        <ul key={`ul-${i}`} style={{ paddingLeft: 20, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map((item, idx) => (
            <li key={idx} style={{ fontSize: 14, color: MUTED, lineHeight: 1.65 }}>
              {inlineFormat(item)}
            </li>
          ))}
        </ul>
      )
      continue
    }

    // Numbered list
    if (/^\d+\. /.test(line)) {
      const items = []
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, ''))
        i++
      }
      elements.push(
        <ol key={`ol-${i}`} style={{ paddingLeft: 22, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map((item, idx) => (
            <li key={idx} style={{ fontSize: 14, color: MUTED, lineHeight: 1.65 }}>
              {inlineFormat(item)}
            </li>
          ))}
        </ol>
      )
      continue
    }

    // Empty line
    if (line.trim() === '') {
      i++; continue
    }

    // Paragraph
    const paraLines = []
    while (i < lines.length && lines[i].trim() !== '' && !lines[i].startsWith('#') && !lines[i].startsWith('-') && !lines[i].startsWith('|') && lines[i].trim() !== '---' && !/^\d+\. /.test(lines[i])) {
      paraLines.push(lines[i])
      i++
    }
    if (paraLines.length > 0) {
      const text = paraLines.join(' ')
      const isLead = text.startsWith('**') && text.endsWith('**')
      elements.push(
        <p key={`p-${i}`} style={{
          fontSize: isLead ? 15 : 14,
          color: isLead ? FG : MUTED,
          lineHeight: 1.75,
          marginBottom: 16,
          fontWeight: isLead ? 500 : 400,
        }}>
          {inlineFormat(isLead ? text.slice(2, -2) : text)}
        </p>
      )
    }
  }
  return elements
}

export default function ArticleViewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isLight } = useTheme()
  const article = ARTICLES[id]

  if (!article) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: MUTED }}>
        <div style={{ marginBottom: 16 }}>Artikel nicht gefunden.</div>
        <button onClick={() => navigate('/analyse')} style={{ color: A, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>← Zurück zu Analysen</button>
      </div>
    )
  }

  const color = isLight ? article.colorLight : article.color

  return (
    <div style={{ padding: '0 0 60px' }}>
      {/* Header bar */}
      <div style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}`, padding: '16px 24px' }}>
        <button onClick={() => navigate('/analyse')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontSize: 13, marginBottom: 12, padding: 0, fontFamily: "'Space Grotesk', sans-serif" }}>
          <ArrowLeft size={14} /> Analysen
        </button>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          {article.tags.map(t => (
            <span key={t} style={{ fontSize: 10, fontWeight: 700, background: `${color}18`, color, padding: '3px 10px', borderRadius: 100, letterSpacing: '0.06em', textTransform: 'uppercase', border: `1px solid ${color}30` }}>{t}</span>
          ))}
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: MUTED }}>{article.region} · {article.date}</span>
        </div>
      </div>

      {/* Article body */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px' }}>
        {/* KPI strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 40 }}>
          {article.kpis.map(k => (
            <div key={k.label} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '14px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color, letterSpacing: '-0.03em', marginBottom: 4 }}>{k.value}</div>
              <div style={{ fontSize: 10, color: MUTED, fontFamily: "'Space Mono', monospace", letterSpacing: '0.06em' }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* Rendered article */}
        <div style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          {renderMarkdown(article.content)}
        </div>
      </div>
    </div>
  )
}
