const express = require('express');
const bodyParser = require('body-parser');
const AWS = require('aws-sdk');
const jwt = require('jsonwebtoken');

const app = express();
const port = 3000;
app.use(express.json());

AWS.config.update({ region: 'eu-north-1' });
const cognito = new AWS.CognitoIdentityServiceProvider();
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const CLIENT_ID = '5u8pmrkti2j5hsntkm5srtkb3v';
const USER_POOL_ID = 'eu-north-1_SBN2he5bz'; // Replace with your user pool ID
const TABLE_NAME = 'Users'; // Replace with your DynamoDB table name

app.post('/signup', async (req, res) => {
  const { username, password, email, name, age } = req.body;

  try {
    const params = {
      ClientId: CLIENT_ID,
      Password: password,
      Username: username,
      UserAttributes: [
        {
          Name: 'email',
          Value: email,
        },
      ],
    };

    const data = await cognito.signUp(params).promise();

    // Automatically confirm the user
    await cognito.adminConfirmSignUp({
      UserPoolId: USER_POOL_ID,
      Username: username,
    }).promise();

    // Store additional attributes in DynamoDB
    const dynamoParams = {
      TableName: TABLE_NAME,
      Item: {
        username: username,
        email: email,
        name: name,
        age: age,
      },
    };

    await dynamoDB.put(dynamoParams).promise();

    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/confirm', async (req, res) => {
  const { username, code } = req.body;

  try {
    const params = {
      ClientId: CLIENT_ID,
      ConfirmationCode: code,
      Username: username,
    };

    const data = await cognito.confirmSignUp(params).promise();
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const params = {
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: CLIENT_ID,
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password,
      },
    };

    const data = await cognito.initiateAuth(params).promise();
    const idToken = data.AuthenticationResult.IdToken;
    res.json({ idToken });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/resend-confirmation', async (req, res) => {
  const { username } = req.body;

  try {
    const params = {
      ClientId: CLIENT_ID,
      Username: username,
    };

    const data = await cognito.resendConfirmationCode(params).promise();
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/getuser/:username', async (req, res) => {
    const { username } = req.params;
  
    const dynamoParams = {
      TableName: TABLE_NAME,
      Key: {
        username: username,
      },
    };
  
    try {
      const data = await dynamoDB.get(dynamoParams).promise();
      if (data.Item) {
        res.json(data.Item);
      } else {
        res.status(404).json({ error: 'User not found' });
      }
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

app.listen(port, () => {
  console.log(`Server started on http://localhost:${port}`);
});