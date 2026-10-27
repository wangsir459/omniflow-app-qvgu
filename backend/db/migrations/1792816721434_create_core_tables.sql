CREATE TABLE IF NOT EXISTS equipment (
  id text PRIMARY KEY,
  name text NOT NULL,
  location text NOT NULL,
  body_part text NOT NULL,
  muscles text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  safety_notes text NOT NULL DEFAULT '',
  max_concurrent integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'normal',
  maintenance_note text,
  expected_recovery text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reservations (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  date text NOT NULL,
  day_name text NOT NULL DEFAULT '训练日',
  window_start integer NOT NULL,
  window_end integer NOT NULL,
  status text NOT NULL,
  start_minute integer,
  total_minutes integer NOT NULL,
  segments jsonb NOT NULL,
  wait_reason_code text,
  wait_reason text,
  client_key text,
  late_cancel boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 1,
  checked_in_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS reservations_user_date_active_idx
  ON reservations (user_id, date)
  WHERE status IN ('scheduled', 'waiting', 'checked_in');

CREATE INDEX IF NOT EXISTS reservations_date_status_idx ON reservations (date, status);

INSERT INTO equipment (id, name, location, body_part, muscles, description, safety_notes, max_concurrent, status, maintenance_note, expected_recovery) VALUES
('eq-bench', '平板卧推架 #A01', '力量区 1 号位', '胸', '胸大肌、三角肌前束、肱三头肌', '调整卧推凳位置，使杠铃位于眼睛正上方，肩胛收紧贴凳，双脚踩实地面，匀速下放至胸部再推起。', '必须使用安全挡杆；大重量训练请找保护者；杠铃片务必锁紧卡扣。', 1, 'normal', NULL, NULL),
('eq-chest-press', '坐姿推胸机 #A02', '力量区 2 号位', '胸', '胸大肌、肱三头肌', '调整座椅高度使握把与胸口齐平，背部贴紧靠垫，推出时不要锁死肘关节。', '起始重量从轻开始；推出时避免耸肩；结束后缓慢放回。', 1, 'normal', NULL, NULL),
('eq-smith', '史密斯架 #A03', '力量区 3 号位', '胸', '胸大肌、股四头肌、臀大肌', '固定轨迹的杠铃架，适合新手练习卧推与深蹲，使用前确认挂钩角度。', '每次训练前设置好安全挂钩；两侧负重保持一致；结束后及时卸片。', 2, 'normal', NULL, NULL),
('eq-lat', '高位下拉机 #B05', '力量区 8 号位', '背', '背阔肌、肱二头肌', '坐稳后固定大腿垫，宽握横杆，沉肩下拉至锁骨附近，控制回放。', '不要借助身体后仰甩动；下拉时避免拉到颈后；回放时不要松手。', 1, 'normal', NULL, NULL),
('eq-row', '坐姿划船机 #B06', '力量区 9 号位', '背', '背阔肌、菱形肌、斜方肌', '胸部贴紧垫子，沿身体两侧向后拉，感受肩胛收紧，缓慢还原。', '保持脊柱中立；避免过度耸肩；调整座位后确认锁紧。', 1, 'normal', NULL, NULL),
('eq-leg-press', '腿举机 #C01', '力量区 5 号位', '腿', '股四头肌、臀大肌、腘绳肌', '双脚与肩同宽踩在踏板中部，下放至膝盖约 90 度再蹬起。', '蹬起时不要锁死膝盖；腰部全程贴紧靠背；结束后拉起安全锁。', 1, 'maintenance', '踏板滑轨异响，等待厂家更换配件', '10月26日'),
('eq-hack', '哈克深蹲机 #C02', '力量区 6 号位', '腿', '股四头肌、臀大肌', '背部贴紧靠垫，双脚站在踏板上，沿固定轨迹下蹲并蹬起。', '负重前确认安全挂钩；膝盖方向与脚尖一致；不要弹震。', 1, 'normal', NULL, NULL),
('eq-leg-ext', '腿屈伸机 #C03', '力量区 7 号位', '腿', '股四头肌、腘绳肌', '调整靠背和腿垫位置，使膝关节对齐机器转轴，匀速完成伸展。', '避免快速甩动；膝关节有不适请立即停止；轻重量热身。', 1, 'normal', NULL, NULL),
('eq-shoulder', '坐姿肩推机 #D01', '力量区 4 号位', '肩', '三角肌、肱三头肌', '调整座椅高度使握把略高于肩，向上推起至手臂接近伸直。', '推起时不要耸肩；避免腰部过度反弓；放回时缓慢控制。', 1, 'normal', NULL, NULL),
('eq-dumbbell', '哑铃区', '自由重量区', '肩', '全身多肌群', '自由重量区，可同时容纳多人，使用后请归位哑铃。', '周围保持安全距离；放置哑铃时注意脚部；不要抛掷哑铃。', 6, 'normal', NULL, NULL),
('eq-cable', '绳索训练架 #E01', '力量区 10 号位', '手臂', '肱二头肌、肱三头肌', '调整滑轮高度和配重，选择合适握把，固定上臂完成弯举或下压。', '使用前检查钢缆与扣环；不要用身体惯性发力；松手前确认配重已落稳。', 2, 'normal', NULL, NULL),
('eq-abs', '腹肌训练机 #F01', '核心区 1 号位', '核心', '腹直肌、腹斜肌', '坐稳后双脚固定，用腹部发力卷腹，保持呼吸节奏。', '不要用手臂拉动；颈部放松；腰部不适时减轻重量。', 1, 'normal', NULL, NULL),
('eq-treadmill', '跑步机区', '有氧区', '有氧', '心肺、下肢肌群', '共 8 台跑步机，可自行调节坡度与速度，热身与整理均适用。', '佩戴安全夹；开始前将速度调到最低；下机前确认履带停稳。', 8, 'normal', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO reservations (id, user_id, date, day_name, window_start, window_end, status, start_minute, total_minutes, segments) VALUES
('seed-r1', 'seed-1', to_char(current_date + 1, 'YYYY-MM-DD'), '推日', 1020, 1140, 'scheduled', 1020, 92,
 '[{"order":1,"equipmentId":"eq-bench","equipmentName":"平板卧推架 #A01","bodyPart":"胸","location":"力量区 1 号位","duration":60,"start":1020,"end":1080},{"order":2,"equipmentId":"eq-smith","equipmentName":"史密斯架 #A03","bodyPart":"胸","location":"力量区 3 号位","duration":30,"start":1082,"end":1112}]'::jsonb),
('seed-r2', 'seed-2', to_char(current_date + 1, 'YYYY-MM-DD'), '推日', 1080, 1200, 'scheduled', 1080, 92,
 '[{"order":1,"equipmentId":"eq-bench","equipmentName":"平板卧推架 #A01","bodyPart":"胸","location":"力量区 1 号位","duration":60,"start":1080,"end":1140},{"order":2,"equipmentId":"eq-smith","equipmentName":"史密斯架 #A03","bodyPart":"胸","location":"力量区 3 号位","duration":30,"start":1142,"end":1172}]'::jsonb),
('seed-r3', 'seed-3', to_char(current_date + 1, 'YYYY-MM-DD'), '推日', 1140, 1260, 'scheduled', 1140, 92,
 '[{"order":1,"equipmentId":"eq-bench","equipmentName":"平板卧推架 #A01","bodyPart":"胸","location":"力量区 1 号位","duration":60,"start":1140,"end":1200},{"order":2,"equipmentId":"eq-smith","equipmentName":"史密斯架 #A03","bodyPart":"胸","location":"力量区 3 号位","duration":30,"start":1202,"end":1232}]'::jsonb),
('seed-r4', 'seed-4', to_char(current_date + 1, 'YYYY-MM-DD'), '推日', 1200, 1320, 'scheduled', 1200, 92,
 '[{"order":1,"equipmentId":"eq-bench","equipmentName":"平板卧推架 #A01","bodyPart":"胸","location":"力量区 1 号位","duration":60,"start":1200,"end":1260},{"order":2,"equipmentId":"eq-smith","equipmentName":"史密斯架 #A03","bodyPart":"胸","location":"力量区 3 号位","duration":30,"start":1262,"end":1292}]'::jsonb)
ON CONFLICT (id) DO NOTHING;
