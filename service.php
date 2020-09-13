<?php
echo "PHP Hello World!";
$color = "red";
echo "My car is " . $color . "<br>";
echo "My house is " . $COLOR . "<br>";
echo "My boat is " . $coLOR . "<br>";
?>

<?php
/*
$fileMetadata = new Google_Service_Drive_DriveFile(array(
    'name' => 'config.json',
    'parents' => array('appDataFolder')
));
$content = file_get_contents('files/config.json');
$file = $driveService->files->create($fileMetadata, array(
    'data' => $content,
    'mimeType' => 'application/json',
    'uploadType' => 'multipart',
    'fields' => 'id'));
printf("File ID: %s\n", $file->id);
*/
?>

<?php
/*
$response = $driveService->files->listFiles(array(
    'spaces' => 'appDataFolder',
    'fields' => 'nextPageToken, files(id, name)',
    'pageSize' => 10
));
foreach ($response->files as $file) {
    printf("Found file: %s (%s)", $file->name, $file->id);
}*/
?>
