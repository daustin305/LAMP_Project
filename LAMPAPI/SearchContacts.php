<?php

	$inData = getRequestInfo();
	
	$userId = $inData["userId"] ?? 0;
    $searchResults = [];

    //Checks for valid user ID
    if ($userId <= 0) {
        echo json_encode(["error" => "Invalid User ID", "results" => []]);
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
		$stmt = $conn->prepare("SELECT ID, firstName, lastName, Phone, Email FROM Contacts 
                WHERE (firstName LIKE ? OR lastName LIKE ? OR Email LIKE ? OR Phone LIKE ?) AND UserID = ?");

        $searchTerm = "%" . $inData["search"] . "%";
        $stmt->bind_param("ssssi", $searchTerm, $searchTerm, $searchTerm, $searchTerm, $userId);
        
        $stmt->execute();
		
		$result = $stmt->get_result();
		
		while($row = $result->fetch_assoc())
		{
			$searchResults[] = $row;
		}
		
		if(count($searchResults) == 0)
		{
			returnWithError( "No Records Found" );
		}
		else
		{
			returnWithInfo( $searchResults );
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
	
	function returnWithError($err)
    {
        $retValue = json_encode(["results"=>[], "error"=>$err]);
        sendResultInfoAsJson($retValue);
    }

    function returnWithInfo($searchResults)
    {
        $retValue = json_encode(["results"=>$searchResults, "error"=>""]);
        sendResultInfoAsJson($retValue);
    }
	
?>