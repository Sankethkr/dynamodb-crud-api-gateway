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
    // Your getPost logic here...
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

    // Validate the incoming data
    validatePostData(body);

    const objKeys = Object.keys(body);
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: marshall({ postId: event.pathParameters.postId }),
      UpdateExpression: `SET ${objKeys
        .map((_, index) => `#key${index} = :value${index}`)
        .join(', ')}`,
      ExpressionAttributeNames: objKeys.reduce(
        (acc, key, index) => ({
          ...acc,
          [`#key${index}`]: key,
        }),
        {}
      ),
      ExpressionAttributeValues: marshall(
        objKeys.reduce(
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
  // deletePost,
  // getAllPosts,
};
