const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, PageOrientation
} = require("docx");
const fs = require("fs");

const TOTAL_WEEKS = 8;
const PAGE_WIDTH_DXA = 15840;
const PAGE_HEIGHT_DXA = 12240;
const MARGIN = 720;
const CONTENT_WIDTH = PAGE_WIDTH_DXA - MARGIN * 2;

const LABEL_COL = 2200;
const WEEK_COL = Math.floor((CONTENT_WIDTH - LABEL_COL) / TOTAL_WEEKS);

const COLORS = {
  teal:   "1D9E75",
  blue:   "378ADD",
  purple: "534AB7",
  amber:  "BA7517",
  coral:  "993C1D",
  green:  "3B6D11",
  empty:  "F4F7FB",
  header: "0D1B4B",
  phase:  "E8EDF5",
  white:  "FFFFFF",
  border: "C8D0E0",
};

const phases = [
  {
    label: "Phase 1 — Setup & Architecture",
    color: COLORS.teal,
    tasks: [
      { name: "AWS account & IAM roles",    start: 1, end: 1 },
      { name: "Architecture design",         start: 1, end: 1 },
      { name: "GitHub repo + CI setup",      start: 1, end: 2 },
    ],
  },
  {
    label: "Phase 2 — Backend & Storage",
    color: COLORS.blue,
    tasks: [
      { name: "S3 buckets + DynamoDB",       start: 2, end: 2 },
      { name: "Cognito auth (login)",         start: 2, end: 3 },
      { name: "API Gateway + Lambda",         start: 2, end: 3 },
      { name: "File upload pipeline",         start: 3, end: 3 },
    ],
  },
  {
    label: "Phase 3 — AI & RAG Pipeline",
    color: COLORS.purple,
    tasks: [
      { name: "Textract OCR integration",    start: 3, end: 4 },
      { name: "Bedrock embeddings",           start: 4, end: 4 },
      { name: "Vector store (S3/DynamoDB)",   start: 4, end: 5 },
      { name: "RAG query engine",             start: 5, end: 5 },
      { name: "Per-case AI isolation",        start: 5, end: 5 },
    ],
  },
  {
    label: "Phase 4 — Frontend",
    color: COLORS.amber,
    tasks: [
      { name: "React app + Amplify",          start: 5, end: 6 },
      { name: "Case management UI",           start: 6, end: 6 },
      { name: "Document upload UI",           start: 6, end: 6 },
      { name: "AI chat interface",            start: 6, end: 7 },
    ],
  },
  {
    label: "Phase 5 — Testing & Accuracy",
    color: COLORS.coral,
    tasks: [
      { name: "Load bail judgments dataset",  start: 7, end: 7 },
      { name: "Accuracy evaluation",          start: 7, end: 7 },
      { name: "Bug fixes & polish",           start: 7, end: 8 },
    ],
  },
  {
    label: "Phase 6 — Dissertation Writing",
    color: COLORS.green,
    tasks: [
      { name: "Literature review & gap",      start: 1, end: 3 },
      { name: "Methodology chapter",          start: 4, end: 6 },
      { name: "Results & evaluation",         start: 7, end: 8 },
      { name: "Final submission polish",      start: 8, end: 8 },
    ],
  },
];

function cellBorder(color = COLORS.border) {
  const b = { style: BorderStyle.SINGLE, size: 1, color };
  return { top: b, bottom: b, left: b, right: b };
}

function emptyCell() {
  return new TableCell({
    width: { size: WEEK_COL, type: WidthType.DXA },
    borders: cellBorder(),
    shading: { fill: COLORS.empty, type: ShadingType.CLEAR },
    margins: { top: 40, bottom: 40, left: 60, right: 60 },
    children: [new Paragraph({ children: [] })],
  });
}

function filledCell(color, label, span) {
  return new TableCell({
    width: { size: WEEK_COL * span, type: WidthType.DXA },
    columnSpan: span,
    borders: cellBorder(color),
    shading: { fill: color, type: ShadingType.CLEAR },
    margins: { top: 40, bottom: 40, left: 80, right: 60 },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: span > 1 ? label : "",
            color: "FFFFFF",
            size: 16,
            bold: true,
            font: "Arial",
          }),
        ],
      }),
    ],
  });
}

function labelCell(text, color, isPhase = false) {
  return new TableCell({
    width: { size: LABEL_COL, type: WidthType.DXA },
    borders: cellBorder(isPhase ? color : COLORS.border),
    shading: { fill: isPhase ? color : COLORS.white, type: ShadingType.CLEAR },
    margins: { top: 40, bottom: 40, left: 120, right: 80 },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            color: isPhase ? "FFFFFF" : "1A1A2E",
            size: isPhase ? 18 : 16,
            bold: isPhase,
            font: "Arial",
          }),
        ],
      }),
    ],
  });
}

function buildTaskRow(task, color) {
  const cells = [labelCell(task.name, color, false)];
  let w = 1;
  while (w <= TOTAL_WEEKS) {
    if (w === task.start) {
      const span = task.end - task.start + 1;
      cells.push(filledCell(color, task.name, span));
      w = task.end + 1;
    } else {
      cells.push(emptyCell());
      w++;
    }
  }
  return new TableRow({ children: cells, height: { value: 380, rule: "exact" } });
}

function buildPhaseHeaderRow(phase) {
  const weekCells = Array.from({ length: TOTAL_WEEKS }, () =>
    new TableCell({
      width: { size: WEEK_COL, type: WidthType.DXA },
      borders: cellBorder(phase.color),
      shading: { fill: phase.color, type: ShadingType.CLEAR },
      margins: { top: 40, bottom: 40, left: 60, right: 60 },
      children: [new Paragraph({ children: [] })],
    })
  );
  return new TableRow({
    children: [labelCell(phase.label, phase.color, true), ...weekCells],
    height: { value: 400, rule: "exact" },
  });
}

// Week header row
function buildWeekHeaderRow() {
  const labelHdr = new TableCell({
    width: { size: LABEL_COL, type: WidthType.DXA },
    borders: cellBorder(COLORS.header),
    shading: { fill: COLORS.header, type: ShadingType.CLEAR },
    margins: { top: 60, bottom: 60, left: 120, right: 80 },
    children: [
      new Paragraph({
        children: [new TextRun({ text: "Task", color: "FFFFFF", bold: true, size: 18, font: "Arial" })],
      }),
    ],
  });

  const weekCells = Array.from({ length: TOTAL_WEEKS }, (_, i) =>
    new TableCell({
      width: { size: WEEK_COL, type: WidthType.DXA },
      borders: cellBorder(COLORS.header),
      shading: { fill: COLORS.header, type: ShadingType.CLEAR },
      margins: { top: 60, bottom: 60, left: 40, right: 40 },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: `Wk ${i + 1}`, color: "FFFFFF", bold: true, size: 18, font: "Arial" })],
        }),
      ],
    })
  );

  return new TableRow({ children: [labelHdr, ...weekCells], height: { value: 460, rule: "exact" } });
}

// Spacer row between phases
function buildSpacerRow() {
  const cells = Array.from({ length: TOTAL_WEEKS + 1 }, (_, i) =>
    new TableCell({
      width: { size: i === 0 ? LABEL_COL : WEEK_COL, type: WidthType.DXA },
      borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
      shading: { fill: "FFFFFF", type: ShadingType.CLEAR },
      children: [new Paragraph({ children: [] })],
    })
  );
  return new TableRow({ children: cells, height: { value: 120, rule: "exact" } });
}

// Build all rows
const allRows = [buildWeekHeaderRow()];
phases.forEach((phase, pi) => {
  allRows.push(buildPhaseHeaderRow(phase));
  phase.tasks.forEach(task => allRows.push(buildTaskRow(task, phase.color)));
  if (pi < phases.length - 1) allRows.push(buildSpacerRow());
});

const ganttTable = new Table({
  width: { size: CONTENT_WIDTH, type: WidthType.DXA },
  columnWidths: [LABEL_COL, ...Array(TOTAL_WEEKS).fill(WEEK_COL)],
  rows: allRows,
});

// Legend table
function legendItem(color, label) {
  return [
    new TableCell({
      width: { size: 240, type: WidthType.DXA },
      borders: cellBorder(color),
      shading: { fill: color, type: ShadingType.CLEAR },
      margins: { top: 60, bottom: 60, left: 80, right: 80 },
      children: [new Paragraph({ children: [] })],
    }),
    new TableCell({
      width: { size: 1200, type: WidthType.DXA },
      borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
      margins: { top: 60, bottom: 60, left: 120, right: 80 },
      children: [new Paragraph({ children: [new TextRun({ text: label, size: 16, font: "Arial", color: "333333" })] })],
    }),
  ];
}

const legendPairs = [
  [COLORS.teal,   "Setup"],
  [COLORS.blue,   "Backend"],
  [COLORS.purple, "AI Pipeline"],
  [COLORS.amber,  "Frontend"],
  [COLORS.coral,  "Testing"],
  [COLORS.green,  "Dissertation"],
];

const legendRows = [];
for (let i = 0; i < legendPairs.length; i += 3) {
  const group = legendPairs.slice(i, i + 3);
  const cells = [];
  group.forEach(([c, l]) => cells.push(...legendItem(c, l)));
  while (cells.length < 6) {
    cells.push(new TableCell({ width: { size: 240, type: WidthType.DXA }, borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }, children: [new Paragraph({ children: [] })] }));
    cells.push(new TableCell({ width: { size: 1200, type: WidthType.DXA }, borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }, children: [new Paragraph({ children: [] })] }));
  }
  legendRows.push(new TableRow({ children: cells }));
}

const legendTable = new Table({
  width: { size: CONTENT_WIDTH, type: WidthType.DXA },
  columnWidths: [240, 1200, 240, 1200, 240, 1200],
  rows: legendRows,
});

// Summary stats table
function statCell(num, label, color) {
  return new TableCell({
    width: { size: Math.floor(CONTENT_WIDTH / 4), type: WidthType.DXA },
    borders: cellBorder(color),
    shading: { fill: "F4F7FB", type: ShadingType.CLEAR },
    margins: { top: 120, bottom: 120, left: 120, right: 120 },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: num, bold: true, size: 40, font: "Arial", color })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: label, size: 16, font: "Arial", color: "666666" })],
      }),
    ],
  });
}

const statsTable = new Table({
  width: { size: CONTENT_WIDTH, type: WidthType.DXA },
  columnWidths: Array(4).fill(Math.floor(CONTENT_WIDTH / 4)),
  rows: [
    new TableRow({
      children: [
        statCell("8",    "Weeks total",     COLORS.teal),
        statCell("22",   "Tasks",           COLORS.blue),
        statCell("~$18", "Est. AWS cost",   COLORS.purple),
        statCell("7",    "AWS services",    COLORS.amber),
      ],
      height: { value: 900, rule: "exact" },
    }),
  ],
});

// Milestones
function milestone(week, text) {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    children: [
      new TextRun({ text: `Week ${week}  `, bold: true, size: 18, font: "Arial", color: COLORS.coral }),
      new TextRun({ text, size: 18, font: "Arial", color: "333333" }),
    ],
  });
}

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 20 } } },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Arial", color: "0D1B4B" },
        paragraph: { spacing: { before: 240, after: 160 }, outlineLevel: 0 },
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: "1D9E75" },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 1 },
      },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: PAGE_WIDTH_DXA, height: PAGE_HEIGHT_DXA, orientation: PageOrientation.LANDSCAPE },
          margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: COLORS.teal, space: 1 } },
              spacing: { after: 120 },
              children: [
                new TextRun({ text: "LexCloud  —  Project Gantt Chart", bold: true, size: 20, font: "Arial", color: "0D1B4B" }),
                new TextRun({ text: "     |     AI-Powered Legal Document Intelligence  |  AWS Mumbai Region  |  8-Week Dissertation Plan", size: 18, font: "Arial", color: "888888" }),
              ],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              border: { top: { style: BorderStyle.SINGLE, size: 4, color: COLORS.teal, space: 1 } },
              spacing: { before: 80 },
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({ text: "Page ", size: 16, font: "Arial", color: "888888" }),
                new TextRun({ children: [PageNumber.CURRENT], size: 16, font: "Arial", color: "888888" }),
              ],
            }),
          ],
        }),
      },
      children: [
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun("Project Timeline — LexCloud")],
        }),
        new Paragraph({
          spacing: { after: 200 },
          children: [
            new TextRun({ text: "Final Year Dissertation  |  Cloud-Native Legal AI for Indian Law Firms  |  2025–2026", size: 18, font: "Arial", color: "666666" }),
          ],
        }),

        ganttTable,

        new Paragraph({ spacing: { before: 240, after: 120 }, children: [new TextRun({ text: "Legend", bold: true, size: 22, font: "Arial", color: "0D1B4B" })] }),
        legendTable,

        new Paragraph({ spacing: { before: 240, after: 120 }, children: [new TextRun({ text: "Project Summary", bold: true, size: 22, font: "Arial", color: "0D1B4B" })] }),
        statsTable,

        new Paragraph({ spacing: { before: 240, after: 120 }, children: [new TextRun({ text: "Key Milestones", bold: true, size: 22, font: "Arial", color: "0D1B4B" })] }),
        milestone(2, "— Core AWS infrastructure live (S3, DynamoDB, Lambda, Cognito)"),
        milestone(5, "— RAG pipeline working end-to-end (Textract + Bedrock + query)"),
        milestone(6, "— Full working demo ready for supervisor review"),
        milestone(8, "— Final submission: code + dissertation document"),

        new Paragraph({ spacing: { before: 200 }, children: [new TextRun({ text: "Note: Dissertation writing runs in parallel across all 8 weeks. AWS estimated cost ~$15–20 on $100 credit over 100 days.", size: 16, font: "Arial", color: "888888", italics: true })] }),
      ],
    },
  ],
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("C:/d/deseration/LexCloud_Gantt_Chart.docx", buffer);
  console.log("Saved: C:/d/deseration/LexCloud_Gantt_Chart.docx");
}).catch(err => console.error("Error:", err));
