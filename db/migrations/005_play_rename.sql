-- 놀이터 개편: 카지노 소재 제거 → 구슬(게임 재화)로 즐기는 가격 업다운·뽑기 캡슐·긁는 쿠폰
UPDATE shop_items SET name = '토끼'          WHERE item_key = 'char_bunny';
UPDATE shop_items SET name = '개구리'        WHERE item_key = 'char_frog';
UPDATE shop_items SET name = '문어'          WHERE item_key = 'char_octopus';
UPDATE shop_items SET name = '사자'          WHERE item_key = 'char_lion';
UPDATE shop_items SET name = '야경 카드', image = 'linear-gradient(135deg,#1f2a44,#3b4a6b)' WHERE item_key = 'card_neon';
UPDATE shop_items SET name = '클로버 카드', image = 'linear-gradient(135deg,#dff3e4,#9fd8b0)' WHERE item_key = 'card_clover';
UPDATE shop_items SET name = '초록 테두리', image = '#12a150' WHERE item_key = 'frame_neon';
UPDATE shop_items SET name = '운 좋은 날'    WHERE item_key = 'title_lucky';
UPDATE shop_items SET name = '끈기왕'        WHERE item_key = 'title_highroll';
UPDATE shop_items SET name = '전설의 수집가' WHERE item_key = 'title_jackpot';
-- 포인트 꾸미기도 과한 그라디언트를 차분한 색으로
UPDATE shop_items SET image = 'linear-gradient(135deg,#ffd9c7,#ffb59a)' WHERE item_key = 'card_sunset';
UPDATE shop_items SET image = 'linear-gradient(135deg,#d7f0ea,#a9dccf)' WHERE item_key = 'card_mint';
UPDATE shop_items SET image = 'linear-gradient(135deg,#2b2f45,#4a4f73)' WHERE item_key = 'card_night';
UPDATE shop_items SET image = 'linear-gradient(135deg,#f3e3b5,#d9b45a)' WHERE item_key = 'card_gold';
UPDATE shop_items SET name = '주황 테두리', image = '#ff5b2e' WHERE item_key = 'frame_fire';
UPDATE shop_items SET name = '금색 테두리', image = '#c9a13b' WHERE item_key = 'frame_gold';
