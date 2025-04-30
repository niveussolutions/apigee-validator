// test.validator.js
const validator = require('./validator');

const schema = {
  _anyOf: ['phone_number', 'policy_number'],
  phone_number: { type: 'number', phone: true },
  policy_number: { type: 'string', minLength: 5 },
  name: { type: 'string', required: true},
};

const testCases = [
  {
    description: 'Valid: name and phone_number provided',
    input: { name: 'John bjkbj hjkbjkb', phone_number: 1234567899 },
  },
  {
    description: 'Valid: name and policy_number provided',
    input: { name: 'John', policy_number: 'POL12345' },
  },
  {
    description: 'Invalid: name only (missing phone_number and policy_number)',
    input: { name: 'John' },
  },
  {
    description: 'Invalid: neither name nor any required fields',
    input: {},
  },
  {
    description: 'Valid: name, phone_number and policy_number provided',
    input: { name: 'John', phone_number: '1234567890', policy_number: 'POL123' },
  },
];

testCases.forEach((test, index) => {
  const result = validator.validateRequestBody(test.input, schema, true);
  console.log(`\nTest Case ${index + 1}: ${test.description}`);
  console.log("Input:", test.input);
  console.log("Errors:", result.errors);
  console.log("Validated Body:", result.validRequestBody);
});
