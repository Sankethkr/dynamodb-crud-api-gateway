const {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  DeleteItemCommand,
  ScanCommand,
  UpdateItemCommand,
} = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');

const client = new DynamoDBClient();

// Regular expressions for validation
const phoneNumberRegex = /^\d{10}$/; // Matches 10-digit phone numbers
const emailRegex = /^[A-Za-z0-9+_.-]+@(.+)$/; // Matches email addresses
const nameRegex = /^[A-Za-z\s]+$/; // Matches names (only letters and spaces)
const addressRegex = /^[A-Za-z0-9\s]+$/; // Matches addresses (letters, numbers, and spaces)

const validatePostData = (postData) => {
  if (
    !(
      postData.postId &&
      postData.name &&
      postData.Address &&
      postData.Phone &&
      postData['personal email'] &&
      postData['Emergency contact name'] &&
      postData['Emergency Phone Number']
    )
  ) {
    throw new Error('Required fields are missing.');
  }

  if (!phoneNumberRegex.test(postData.Phone)) {
    throw new Error('Invalid phone number.');
  }

  if (!emailRegex.test(postData['personal email'])) {
    throw new Error('Invalid email address.');
  }

  if (!nameRegex.test(postData.name)) {
    throw new Error('Invalid name.');
  }

  if (!addressRegex.test(postData.Address)) {
    throw new Error('Invalid address.');
  }
};

const getPost = async (event) => {
  const response = { statusCode: 200 };
  try {
    const email = event.pathParameters.email; // Get the email from the URL path

    if (!email || !emailRegex.test(email)) {
      throw new Error('Invalid or missing email parameter.');
    }

    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: {
        'personal email': { S: email }, // Construct the key based on your DynamoDB item structure
      },
    };

    const getResult = await client.send(new GetItemCommand(params));

    if (!getResult.Item) {
      throw new Error('No data found for the provided email.');
    }

    // Convert the DynamoDB item back to a JavaScript object
    const postData = unmarshall(getResult.Item);

    response.body = JSON.stringify({
      message: 'Successfully retrieved post.',
      postData,
    });
  } catch (e) {
    console.error(e);
    response.statusCode = 500;
    response.body = JSON.stringify({
      message: 'Failed to get post.',
      errorMsg: e.message,
      errorStack: e.stack,
    });
  }
  return response;
};


const createPost = async (event) => {
  const response = { statusCode: 200 };
  try {
    const body = JSON.parse(event.body);

    // Validate the incoming data
    validatePostData(body);

    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Item: marshall(body || {}),
    };
    const createResult = await client.send(new PutItemCommand(params));
    response.body = JSON.stringify({
      message: 'Successfully created post.',
      createResult,
    });
  } catch (e) {
    console.error(e);
    response.statusCode = 500;
    response.body = JSON.stringify({
      message: 'Failed to create post.',
      errorMsg: e.message,
      errorStack: e.stack,
    });
  }
  return response;
};

const updatePost = async (event) => {
  const response = { statusCode: 200 };
  try {
    const body = JSON.parse(event.body);

    // Check if required fields are present for creating a post
    if (!body.postId) {
      throw new Error('Required fields are missing for updating a post.');
    }

    const objKeys = Object.keys(body);
    if (objKeys.length === 0) {
      throw new Error('No fields provided for updating the post.');
    }

    // Validate the incoming data
    validatePostData(body);

    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: marshall({ postId: event.pathParameters.postId }),
      UpdateExpression: `SET ${objKeys
        .filter((key) => key !== 'postId') // Exclude postId from updates
        .map((_, index) => `#key${index} = :value${index}`)
        .join(', ')}`,
      ExpressionAttributeNames: objKeys
        .filter((key) => key !== 'postId') // Exclude postId from updates
        .reduce(
          (acc, key, index) => ({
            ...acc,
            [`#key${index}`]: key,
          }),
          {}
        ),
      ExpressionAttributeValues: marshall(
        objKeys
          .filter((key) => key !== 'postId') // Exclude postId from updates
          .reduce(
            (acc, key, index) => ({
              ...acc,
              [`:value${index}`]: body[key],
            }),
            {}
          )
      ),
    };
    const updateResult = await client.send(new UpdateItemCommand(params));
    response.body = JSON.stringify({
      message: 'Successfully updated post.',
      updateResult,
    });
  } catch (e) {
    console.error(e);
    response.statusCode = 500;
    response.body = JSON.stringify({
      message: 'Failed to update post.',
      errorMsg: e.message,
      errorStack: e.stack,
    });
  }
  return response;
};

// ... rest of your code ...

module.exports = {
  getPost,
  createPost,
  updatePost,
};
