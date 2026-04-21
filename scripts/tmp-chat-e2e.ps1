$ErrorActionPreference='Stop'
$token22='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MjIsIm5hbWUiOiJBY2FkZW15IFN0dWRlbnQiLCJlbWFpbCI6ImFjYWRlbXlfc3R1ZGVudEBsZWFybm92YS5jb20iLCJyb2xlIjoiU1RVREVOVCIsImlhdCI6MTc3NjY3MDgyOSwiZXhwIjoxNzc3Mjc1NjI5fQ.KDEdYkLzbCaE2Qbso52vSECIFnS5iHANIUhHN0oWN-8'
$h22=@{Authorization="Bearer $token22"}
$token43='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NDMsIm5hbWUiOiJBY2FkZW15IEJ1eWVyIiwiZW1haWwiOiJhY2FkZW15X2J1eWVyQGxlYXJub3ZhLmNvbSIsInJvbGUiOiJTVFVERU5UIiwiaWF0IjoxNzc2ODEwNTM4LCJleHAiOjE3Nzc0MTUzMzh9.680LCygHbeGrOcBSASU-J9cpkcEt4ZDKiGE3uXa7IN8'
$h43=@{Authorization="Bearer $token43"}
$chatId=101
$stamp=(Get-Date).ToString('HHmmss')

$a43=Invoke-RestMethod -Method Post -Uri "http://localhost:5000/api/chats/$chatId/messages" -Headers $h43 -ContentType 'application/json' -Body (@{content="A_from_43_$stamp"}|ConvertTo-Json)
$longText='LONG_FROM_43_'+('L'*120)+"_$stamp"
$l43=Invoke-RestMethod -Method Post -Uri "http://localhost:5000/api/chats/$chatId/messages" -Headers $h43 -ContentType 'application/json' -Body (@{content=$longText}|ConvertTo-Json)

$rA=Invoke-RestMethod -Method Post -Uri "http://localhost:5000/api/chats/$chatId/messages" -Headers $h22 -ContentType 'application/json' -Body (@{content="Reply_to_43_A_$stamp"; replyToMessageId=$a43.data.id}|ConvertTo-Json)
$rLong=Invoke-RestMethod -Method Post -Uri "http://localhost:5000/api/chats/$chatId/messages" -Headers $h22 -ContentType 'application/json' -Body (@{content="Reply_to_43_LONG_$stamp"; replyToMessageId=$l43.data.id}|ConvertTo-Json)

$own=Invoke-RestMethod -Method Post -Uri "http://localhost:5000/api/chats/$chatId/messages" -Headers $h22 -ContentType 'application/json' -Body (@{content="OWN_EDIT_DELETE_$stamp"}|ConvertTo-Json)
$edited=Invoke-RestMethod -Method Patch -Uri "http://localhost:5000/api/chats/messages/$($own.data.id)" -Headers $h22 -ContentType 'application/json' -Body (@{content="OWN_EDITED_$stamp"}|ConvertTo-Json)
Invoke-RestMethod -Method Delete -Uri "http://localhost:5000/api/chats/messages/$($own.data.id)" -Headers $h22 | Out-Null

try { Invoke-RestMethod -Method Delete -Uri "http://localhost:5000/api/chats/messages/$($a43.data.id)" -Headers $h22 | Out-Null; $deleteOther='unexpected-success' } catch { $deleteOther='failed-'+[int]$_.Exception.Response.StatusCode }

$all=Invoke-RestMethod -Method Get -Uri "http://localhost:5000/api/chats/$chatId/messages" -Headers $h22
$ids=@($a43.data.id,$l43.data.id,$rA.data.id,$rLong.data.id,$own.data.id)
Write-Output ("TEST_IDS => A43={0}, L43={1}, R_A={2}, R_L={3}, OWN={4}, DeleteOther={5}" -f $a43.data.id,$l43.data.id,$rA.data.id,$rLong.data.id,$own.data.id,$deleteOther)
$all.data | Where-Object { $ids -contains $_.id } | Select-Object id,senderId,content,isDeleted,isEdited,editedAt,replyToMessageId,@{n='replyToId';e={$_.replyTo.id}},@{n='replyToSender';e={$_.replyTo.senderName}},@{n='replyToLen';e={if($_.replyTo){$_.replyTo.content.Length}else{0}}} | Sort-Object id | Format-Table -AutoSize | Out-String
