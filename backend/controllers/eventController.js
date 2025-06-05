const db = require('../db');

// Utility: tính status dựa trên thời gian
function computeStatus(now, saleStart, start, end) {
  if (now < saleStart)       return 'Mới tạo';
  if (now >= saleStart && now < start) return 'Đang mở bán';
  if (now >= start && now <= end)      return 'Đang diễn ra';
  return 'Đã kết thúc';
}

exports.getAllEvents = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM events');
    const now = new Date();
    const withStatus = rows.map(evt => {
      const saleStart = new Date(evt.ticket_sale_start);
      const start     = new Date(evt.start_date);
      const end       = new Date(evt.end_date);
      return {
        ...evt,
        status: computeStatus(now, saleStart, start, end)
      };
    });
    res.json(withStatus);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getEventById = async (req, res) => {
  try {
    const [[evt]] = await db.query('SELECT * FROM events WHERE event_id = ?', [req.params.id]);
    if (!evt) return res.status(404).json({ error: 'Không tìm thấy sự kiện' });
    const now = new Date();
    evt.status = computeStatus(
      now,
      new Date(evt.ticket_sale_start),
      new Date(evt.start_date),
      new Date(evt.end_date)
    );
    res.json(evt);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createEvent = async (req, res) => {
  const {
    event_name, event_description,
    start_date, end_date,
    ticket_sale_start, ticket_sale_end,
    location, main_content,
    target_audience, organizer,
    image_url
  } = req.body;

  // 1. Validate bắt buộc
  if (!event_name || !start_date || !end_date || !ticket_sale_start) {
    return res.status(400).json({ error: 'Thiếu trường bắt buộc' });
  }
  // 2. Ngày hợp lệ
  if (new Date(end_date) <= new Date(start_date)) {
    return res.status(400).json({ error: 'End date phải sau start date' });
  }
  if (ticket_sale_end && new Date(ticket_sale_end) <= new Date(ticket_sale_start)) {
    return res.status(400).json({ error: 'Ticket sale end phải sau ticket sale start' });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO events
        (event_name, event_description, start_date, end_date,
         ticket_sale_start, ticket_sale_end, location,
         main_content, target_audience, organizer, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        event_name, event_description,
        start_date, end_date,
        ticket_sale_start, ticket_sale_end || null,
        location, main_content, target_audience,
        organizer, image_url
      ]
    );
    res.status(201).json({ message: 'Tạo sự kiện thành công', event_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateEvent = async (req, res) => {
  const id = req.params.id;
  const {
    event_name, event_description,
    start_date, end_date,
    ticket_sale_start, ticket_sale_end,
    location, main_content,
    target_audience, organizer,
    image_url
  } = req.body;

  // Tương tự validate
  if (!event_name || !start_date || !end_date || !ticket_sale_start) {
    return res.status(400).json({ error: 'Thiếu trường bắt buộc' });
  }
  if (new Date(end_date) <= new Date(start_date)) {
    return res.status(400).json({ error: 'End date phải sau start date' });
  }
  if (ticket_sale_end && new Date(ticket_sale_end) <= new Date(ticket_sale_start)) {
    return res.status(400).json({ error: 'Ticket sale end phải sau ticket sale start' });
  }

  try {
    await db.query(
      `UPDATE events SET
         event_name=?, event_description=?, start_date=?, end_date=?,
         ticket_sale_start=?, ticket_sale_end=?, location=?,
         main_content=?, target_audience=?, organizer=?, image_url=? 
       WHERE event_id=?`,
      [
        event_name, event_description,
        start_date, end_date,
        ticket_sale_start, ticket_sale_end || null,
        location, main_content, target_audience,
        organizer, image_url, id
      ]
    );
    res.json({ message: 'Cập nhật thành công' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteEvent = async (req, res) => {
  const id = req.params.id;
  try {
    // Chỉ cho phép xóa khi status = 'Mới tạo'
    const [[evt]] = await db.query('SELECT ticket_sale_start, start_date, end_date FROM events WHERE event_id=?', [id]);
    if (!evt) return res.status(404).json({ error: 'Không tìm thấy sự kiện' });
    const now = new Date();
    const status = computeStatus(
      now,
      new Date(evt.ticket_sale_start),
      new Date(evt.start_date),
      new Date(evt.end_date)
    );
    if (status !== 'Mới tạo') {
      return res.status(400).json({ error: 'Chỉ xóa được sự kiện ở trạng thái Mới tạo' });
    }

    await db.query('DELETE FROM events WHERE event_id=?', [id]);
    res.json({ message: 'Xóa sự kiện thành công' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
