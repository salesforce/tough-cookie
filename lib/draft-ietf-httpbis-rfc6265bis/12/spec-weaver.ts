import ts from 'typescript'
import * as fs from 'fs'
import { readFileSync, writeFileSync } from 'fs'
import hljs from 'highlight.js/lib/core'
import typescript from 'highlight.js/lib/languages/typescript'
import * as prettier from 'prettier'
import * as cheerio from 'cheerio'

const stylesheet = readFileSync(
  `${__dirname}/../../../node_modules/highlight.js/styles/github-dark.css`,
  'utf-8',
)

hljs.registerLanguage('typescript', typescript)

const sourcePath = './5-1-1_dates.ts'
const sourceFile = ts.createSourceFile(
  sourcePath,
  fs.readFileSync('./5-1-1_dates.ts', 'utf-8'),
  ts.ScriptTarget.ES2021,
  true,
  ts.ScriptKind.TS,
)

type SpecEntry = {
  locator: string
  nodes: ts.Node[]
}

let currentEntry: SpecEntry | undefined = undefined
const specEntries: SpecEntry[] = []
collectSpecEntries(sourceFile)

function collectSpecEntries(node: ts.Node) {
  if (node.kind === ts.SyntaxKind.FirstStatement) {
    ts.forEachChild(node, collectSpecEntries)
    return
  }

  //console.log(new Array(indent + 1).join(' ') + ts.SyntaxKind[node.kind])
  const leading = ts.getLeadingCommentRanges(sourceFile.text, node.pos)
  if (leading) {
    for (const commentRange of leading) {
      const comment = sourceFile.text.substring(
        commentRange.pos,
        commentRange.end,
      )
      //console.log(comment)
      if (comment.includes('@spec')) {
        // console.log(ts.SyntaxKind[node.kind])
        // currentNode = node
        currentEntry = {
          locator: comment,
          nodes: [node],
        }
        specEntries.push(currentEntry)
      } else if (comment.includes('@endspec')) {
        currentEntry = undefined
      }
    }
  }
  if (currentEntry) {
    const lastNode = currentEntry.nodes[currentEntry.nodes.length - 1]
    if (lastNode && node !== lastNode) {
      let currentParent = node.parent
      while (currentParent) {
        if (lastNode === currentParent) {
          break
        }
        currentParent = currentParent.parent
      }
      if (currentParent === undefined) {
        currentEntry.nodes.push(node)
      }
    }
  }
  // indent++
  ts.forEachChild(node, collectSpecEntries)
  // indent--
}

const $ = cheerio.load(readFileSync('./spec.html', 'utf-8'))
$('head').append('<style id="highlight-css"></style>')
$('#highlight-css').text(stylesheet)
$('head').append('<style>.spec-code pre { padding: 0; }</style>')

const printer = ts.createPrinter({
  newLine: ts.NewLineKind.LineFeed,
  removeComments: true,
  omitTrailingSemicolon: true,
})

specEntries.forEach(specEntryToHtml)

function specEntryToHtml(entry: SpecEntry) {
  const selector = `[id="${entry.locator
    .replace('//', '')
    .replace('@spec', '')
    .replace('#', '')
    .trim()}"]`
  console.log(`Locating spec entry '${selector}'`)
  const el = $(selector)
  if (el.length === 0) {
    console.log(`No node found for selector '${selector}'`)
    return
  } else if (el.length > 1) {
    console.log(`Too many nodes found for selector '${selector}'`)
  }

  el.wrap('<div class="spec-wrapper"></div>')
  el.parent().append('<div class="spec-code"></div>')

  const codeEl = el.parent().find('.spec-code')

  const code = entry.nodes
    .map((node) => {
      return printer.printNode(ts.EmitHint.Unspecified, node, sourceFile)
    })
    .join('\n')

  const formattedResult = prettier.format(code, {
    semi: false,
    parser: 'typescript',
    printWidth: 80,
  })

  const highlightedCode = hljs.highlight(formattedResult, {
    language: 'typescript',
  }).value

  codeEl.html(
    `<pre class="theme-github-dark"><code class="hljs language-typescript">${highlightedCode}</code></pre>`,
  )
}

writeFileSync('./spec-annotated-test.html', $.html())
