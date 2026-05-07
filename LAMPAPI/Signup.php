<?php
    ini_set('display_errors', 1);
    ini_set('display_startup_errors', 1);
    error_reporting(E_ALL);
    $inData = getRequestInfo();

    if (!is_array($inData)) {
        returnWithError("Invalid JSON body");
        exit();
    }

    //Checks for valid input
    if (empty($inData["firstName"]) || empty($inData["lastName"]) || empty($inData["login"]) || empty($inData["password"])) {
        returnWithError("All Fields Required");
        exit();
    }

    $id = 0;
    $firstName = "";
    $lastName = "";
    $hashedPassword = password_hash($inData["password"], PASSWORD_DEFAULT);

    $cfg = require __DIR__ . "/config.php";
	$conn = new mysqli($cfg["db_host"], $cfg["db_user"], $cfg["db_pass"], $cfg["db_name"]);

    if ($conn->connect_error) {
        returnWithError($conn->connect_error);
        exit();
    }

    $stmt = $conn->prepare("SELECT ID FROM Users WHERE Login=?");
    $stmt->bind_param("s", $inData["login"]);
    $stmt->execute();

    $stmt->store_result();

    //Checks if login already exists
    if ($stmt->num_rows > 0) {
        returnWithError("Login Already Exists");
        $stmt->close();
        $conn->close();
        exit();
    }

    $stmt->close();

    $stmt = $conn->prepare("INSERT INTO Users (FirstName,LastName,Login,Password) VALUES(?,?,?,?)");
    $stmt->bind_param("ssss", $inData["firstName"], $inData["lastName"], $inData["login"], $hashedPassword);

    if($stmt->execute()) 
        {
        $userId = $conn->insert_id;
        returnWithInfo($inData["firstName"], $inData["lastName"], $userId);
    } 
    else 
    {
        returnWithError($stmt->error);
    }

    $stmt->close();
    $conn->close();

    function getRequestInfo()
    {
        return json_decode(file_get_contents('php://input'), true);
    }

    function sendResultInfoAsJson($obj)
    {
        header('Content-type: application/json');
        echo $obj;
    }

    function returnWithError($err)
    {
        $retValue = json_encode(["id"=>0, "firstName"=>"", "lastName"=>"", "error"=>$err]);
        sendResultInfoAsJson($retValue);
    }

    function returnWithInfo($firstName, $lastName, $id)
    {
        $retValue = json_encode(["id"=>$id, "firstName"=>$firstName, "lastName"=>$lastName, "error"=>""]);
        sendResultInfoAsJson($retValue);
    }

?>