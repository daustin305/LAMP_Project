<?php

	$inData = getRequestInfo();

	$userId = $inData["userId"] ?? 0;
	$contactId = $inData["contactId"] ?? 0;

	$first_name = trim($inData["firstName"] ?? "");
	$last_name = trim($inData["lastName"] ?? "");
	$phone = trim($inData["phone"] ?? "");
	$email = trim($inData["email"] ?? "");

	// Validate input
	if (
		$userId <= 0 ||
		$contactId <= 0 ||
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
		returnWithError($conn->connect_error);
	}
	else
	{
		$stmt = $conn->prepare("
			UPDATE Contacts
			SET
				FirstName = ?,
				LastName = ?,
				Phone = ?,
				Email = ?
			WHERE
				ID = ?
				AND UserID = ?
		");

		if (!$stmt)
		{
			returnWithError($conn->error);
			exit();
		}

		$stmt->bind_param(
			"ssssii",
			$first_name,
			$last_name,
			$phone,
			$email,
			$contactId,
			$userId
		);

		if ($stmt->execute())
		{
			returnWithInfo();
		}
		else
		{
			returnWithError($stmt->error);
		}

		$stmt->close();
		$conn->close();
	}

	function getRequestInfo()
	{
		return json_decode(file_get_contents('php://input'), true);
	}

	function sendResultInfoAsJson($obj)
	{
		header('Content-type: application/json');
		echo $obj;
	}

	function returnWithInfo()
	{
		$retValue = '{"error":""}';
		sendResultInfoAsJson($retValue);
	}

	function returnWithError($err)
	{
		$retValue = '{"error":"' . $err . '"}';
		sendResultInfoAsJson($retValue);
	}

?>