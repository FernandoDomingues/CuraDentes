-- Remove todos os espaços da coluna cro na tabela curadentespro
-- Isso garante que os links /dentista/CRO-SP123456 funcionem sem %20

UPDATE curadentespro
SET cro = REPLACE(cro, ' ', '')
WHERE cro LIKE '% %';
