<?php
	$inData = getRequestInfo();
	
	$userId = $inData["userId"] ?? 0;
	$first_name = trim($inData["firstName"] ?? "");
	$last_name = trim($inData["lastName"] ?? "");
	$phone = trim($inData["phone"] ?? "");
	$email = trim($inData["email"] ?? "");

	//Validates user input fields
	if (
		$userId <= 0 ||
		$first_name == "" ||
		$last_name == "" ||
		($phone == "" && $email == "")
	)
	{
		returnWithError("Missing required fields");
		exit();
	}

	$cfg = require __DIR__ . "/config.php";
	$conn = new mysqli($cfg["db_host"], $cfg["db_user"], $cfg["db_pass"], $cfg["db_name"]);

	if ($conn->connect_error) 
	{
		returnWithError( $conn->connect_error );
	} 
	else
	{
		$stmt = $conn->prepare("INSERT into Contacts (UserId,FirstName,LastName,Phone,Email) VALUES(?,?,?,?,?)");
        
        if (!$stmt) {
            returnWithError($conn->error);
            exit();
        }

		$stmt->bind_param("issss", $userId, $first_name, $last_name, $phone, $email);
		
        if ($stmt->execute()) {
            returnWithInfo();
        }
        else {
            returnWithError($stmt->error);
        }

		$stmt->close();
		$conn->close();
	}

	function getRequestInfo()
	{
		return json_decode(file_get_contents('php://input'), true);
	}

	function sendResultInfoAsJson( $obj )
	{
		header('Content-type: application/json');
		echo $obj;
	}
	
    function returnWithInfo()
	{
		$retValue = '{"error":""}';
		sendResultInfoAsJson($retValue);
	}
    
	function returnWithError( $err )
	{
		$retValue = '{"error":"' . $err . '"}';
		sendResultInfoAsJson( $retValue );
	}
	
?>