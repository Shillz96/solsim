-- Check bonding curve progress distribution for graduating tokens
SELECT 
  CASE 
    WHEN "bondingCurveProgress" < 30 THEN '0-30%'
    WHEN "bondingCurveProgress" < 40 THEN '30-40%'
    WHEN "bondingCurveProgress" < 50 THEN '40-50%'
    WHEN "bondingCurveProgress" < 60 THEN '50-60%'
    WHEN "bondingCurveProgress" < 70 THEN '60-70%'
    WHEN "bondingCurveProgress" < 80 THEN '70-80%'
    WHEN "bondingCurveProgress" < 90 THEN '80-90%'
    ELSE '90-100%'
  END AS progress_range,
  COUNT(*) as count
FROM "TokenDiscovery"
WHERE state = 'graduating'
GROUP BY progress_range
ORDER BY progress_range;
