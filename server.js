const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'books.json');

app.use(cors());
app.use(express.json());

// 데이터 파일 초기화
function initStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    const initialBooks = [
      {
        id: 1,
        title: 'HTTP 완벽 가이드',
        author: '데이비드 고울리',
        isbn: '9788966261208',
        status: 'available',
        createdAt: '2026-11-24T00:00:00.000Z'
      },
      {
        id: 2,
        title: '모던 자바스크립트 Deep Dive',
        author: '이웅모',
        isbn: '9791158391982',
        status: 'borrowed',
        createdAt: '2026-11-24T00:00:00.000Z'
      }
    ];
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialBooks, null, 2), 'utf8');
  }
}

function readBooks() {
  initStorage();
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  return JSON.parse(raw);
}

function writeBooks(books) {
  initStorage();
  fs.writeFileSync(DATA_FILE, JSON.stringify(books, null, 2), 'utf8');
}

// 루트 안내 페이지 (브라우저 접속 확인용)
app.get('/', (req, res) => {
  res.json({
    service: '도서관리 프로그램 API',
    status: 'running',
    endpoints: {
      getAll: 'GET /api/books',
      getOne: 'GET /api/books/:id',
      create: 'POST /api/books',
      update: 'PUT /api/books/:id',
      remove: 'DELETE /api/books/:id'
    }
  });
});

// 전체 도서 조회 (선택적 검색: ?q=키워드)
app.get('/api/books', (req, res) => {
  try {
    const books = readBooks();
    const q = (req.query.q || '').trim().toLowerCase();

    if (!q) {
      return res.json({ count: books.length, data: books });
    }

    const filtered = books.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        (b.isbn && b.isbn.toLowerCase().includes(q))
    );
    return res.json({ count: filtered.length, data: filtered });
  } catch (err) {
    return res.status(500).json({ error: '도서 목록 조회 중 오류가 발생했습니다.' });
  }
});

// 단건 도서 조회
app.get('/api/books/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: '유효하지 않은 도서 ID입니다.' });
  }

  const books = readBooks();
  const book = books.find((b) => b.id === id);
  if (!book) {
    return res.status(404).json({ error: '해당 도서를 찾을 수 없습니다.' });
  }
  return res.json({ data: book });
});

// 신규 도서 등록
app.post('/api/books', (req, res) => {
  const { title, author, isbn, status } = req.body || {};

  if (!title || !author) {
    return res.status(400).json({ error: '도서명(title)과 저자(author)는 필수입니다.' });
  }

  const validStatus = status === 'borrowed' ? 'borrowed' : 'available';
  const books = readBooks();
  const nextId = books.length > 0 ? Math.max(...books.map((b) => b.id)) + 1 : 1;

  const newBook = {
    id: nextId,
    title: String(title).trim(),
    author: String(author).trim(),
    isbn: isbn ? String(isbn).trim() : '',
    status: validStatus,
    createdAt: new Date().toISOString()
  };

  books.push(newBook);
  writeBooks(books);

  return res.status(201).json({ message: '도서가 등록되었습니다.', data: newBook });
});

// 도서 정보 및 대출 상태 수정
app.put('/api/books/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: '유효하지 않은 도서 ID입니다.' });
  }

  const books = readBooks();
  const idx = books.findIndex((b) => b.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: '해당 도서를 찾을 수 없습니다.' });
  }

  const { title, author, isbn, status } = req.body || {};
  if (status && status !== 'available' && status !== 'borrowed') {
    return res.status(400).json({ error: 'status는 available 또는 borrowed여야 합니다.' });
  }

  const current = books[idx];
  const updatedBook = {
    ...current,
    title: title !== undefined ? String(title).trim() : current.title,
    author: author !== undefined ? String(author).trim() : current.author,
    isbn: isbn !== undefined ? String(isbn).trim() : current.isbn,
    status: status !== undefined ? status : current.status,
    updatedAt: new Date().toISOString()
  };

  books[idx] = updatedBook;
  writeBooks(books);

  return res.json({ message: '도서 정보가 수정되었습니다.', data: updatedBook });
});

// 도서 삭제
app.delete('/api/books/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: '유효하지 않은 도서 ID입니다.' });
  }

  const books = readBooks();
  const idx = books.findIndex((b) => b.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: '해당 도서를 찾을 수 없습니다.' });
  }

  const [deleted] = books.splice(idx, 1);
  writeBooks(books);

  return res.json({ message: '도서가 삭제되었습니다.', data: deleted });
});

app.listen(PORT, () => {
  initStorage();
  console.log(`Book Management API listening on port ${PORT}`);
});