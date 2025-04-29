# Request Body Validation Package for Apigee X

This repository contains a JavaScript-based request body validation package designed for Apigee X. The package includes a set of functions to validate incoming request bodies against a predefined schema, ensuring data integrity and compliance with expected formats.

## Contents

- **JS-validation.js**: Contains the main validation function.
- **JavaScript-1.js**: Demonstrates how to use the validation function in an Apigee X proxy.
- **Apigee X proxy configuration files**:
  - **validate-requestBody.xml**
  - **RF-Validation-Error.xml**
  - **ProxyEndpoint.xml**
  - **TargetEndpoint.xml**

## JS-validation.js

This file contains the `validator.validateRequestBody` function, which validates request bodies against a schema and strips unknown fields if required.

### Function Overview

```javascript
// validator.js
var validator = {};
validator.validateRequestBody = function (requestBody, schema) {
  function isNumber(value) {
    if (typeof value === "number" && isFinite(value) && Number.isInteger(value)) return true;
    if (typeof value === "string" && !isNaN(value) && isFinite(Number(value)) && Number.isInteger(Number(value))) return true;
    return false;
  }

  function isString(value) {
    return typeof value === "string";
  }

  function isPhoneNumber(value) {
    value = value + "";
    return typeof value === "string" && /^\d{10}$/.test(value);
  }

  function isValidDate(value, dateFormat) {
    var datePatterns = {
      "dd/mm/yyyy": /^(0[1-9]|[12][0-9]|3[01])[\/](0[1-9]|1[0-2])[\/]\d{4}$/,
      "dd-mm-yyyy": /^(0[1-9]|[12][0-9]|3[01])[\-](0[1-9]|1[0-2])[\-]\d{4}$/,
      "mm/dd/yyyy": /^(0[1-9]|1[0-2])[\/](0[1-9]|[12][0-9]|3[01])[\/]\d{4}$/,
      "mm-dd-yyyy": /^(0[1-9]|1[0-2])[\-](0[1-9]|[12][0-9]|3[01])[\-]\d{4}$/,
      "yyyy/mm/dd": /^\d{4}[\/](0[1-9]|1[0-2])[\/](0[1-9]|[12][0-9]|3[01])$/,
      "yyyy-mm-dd": /^\d{4}[\-](0[1-9]|1[0-2])[\-](0[1-9]|[12][0-9]|3[01])$/
    };

    dateFormat = dateFormat || "dd/mm/yyyy";
    var pattern = datePatterns[dateFormat];
    return pattern ? pattern.test(value) : false;
  }

  function validateMin(value, min) {
    return Number(value) >= min;
  }

  function validateMax(value, max) {
    return Number(value) <= max;
  }

  function validateMinLength(value, minLength) {
    return value.length >= minLength;
  }

  function validateMaxLength(value, maxLength) {
    return value.length <= maxLength;
  }

  function validateLength(value, length) {
    // console.log("Validating length:", value.length, length);
    
    return value.length === length;
  }

  function validateValidValues(value, validValues) {
    return validValues.includes(value);
  }

  function isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function validateObject(object, schema, errors) {
    var validObject = {};
    var schemaKeys = Object.keys(schema);

    if (schema._anyOf && Array.isArray(schema._anyOf)) {
      const anyOfValid = schema._anyOf.some((field) => object[field] !== undefined && object[field] !== null);
      if (!anyOfValid) {
        errors.push(`At least one of the following fields is required: ${schema._anyOf.join(", ")}`);
      }
    }

    for (var key of schemaKeys) {
      if (key === "_anyOf") continue;
      var rule = schema[key];
      var value = object[key];

      if (rule.required && (value === undefined || value === null)) {
        errors.push('Field ' + key + ' is required.');
        continue;
      }

      if (value !== undefined && value !== null) {
        if (rule.type === "number") {
          if (!rule.phone && !isNumber(value)) {
            errors.push('Field ' + key + ' should be an integer.');
          }
          if (rule.min !== undefined && !validateMin(value, rule.min)) {
            errors.push('Field ' + key + ' should be at least ' + rule.min + '.');
          }
          if (rule.max !== undefined && !validateMax(value, rule.max)) {
            errors.push('Field ' + key + ' should be at most ' + rule.max + '.');
          }
          if (isNumber(value) && rule.round && !Number.isInteger(Number(value))) {
            errors.push('Field ' + key + ' should be a rounded number without decimal points.');
          }
          if (rule.phone && !isPhoneNumber(value)) {
            errors.push('Field ' + key + ' should be a valid 10-digit phone number.');
          }
        } else if (rule.type === "string") {
          if (!isString(value)) {
            errors.push('Field ' + key + ' should be a string.');
          }
          if (rule.minLength !== undefined && !validateMinLength(value, rule.minLength)) {
            errors.push('Field ' + key + ' should have at least ' + rule.minLength + ' characters.');
          }
          if (rule.length !== undefined && !validateLength(value, rule.length)) { 
            errors.push('Field ' + key + ' should be only ' + rule.length + ' characters.');
          }
          if (rule.maxLength !== undefined && !validateMaxLength(value, rule.maxLength)) {
            errors.push('Field ' + key + ' should have at most ' + rule.maxLength + ' characters.');
          }
          if (rule.phone && !isPhoneNumber(value)) {
            errors.push('Field ' + key + ' should be a valid 10-digit phone number.');
          }
          if (rule.validValues && !validateValidValues(value, rule.validValues)) {
            errors.push('Field ' + key + ' should be one of the valid values: ' + rule.validValues.join(', ') + '.');
          }
          if (rule.email && !isEmail(value)) {
            errors.push(`Field ${key} should be a valid email address.`);
          }
        } else if (rule.type === "date") {
          if (!isValidDate(value, rule.dateFormat)) {
            errors.push('Field ' + key + ' should be a valid date in the format ' + (rule.dateFormat || "dd/mm/yyyy") + '.');
          }
        } else if (rule.type === "object") {
          if (typeof value !== "object") {
            errors.push('Field ' + key + ' should be an object.');
          } else {
            var nestedErrors = [];
            var validNestedObject = validateObject(value, rule.properties, nestedErrors);
            if (nestedErrors.length > 0) {
              errors.push(...nestedErrors);
            } else {
              validObject[key] = validNestedObject;
            }
          }
        } else {
          errors.push('Unsupported type ' + rule.type + ' for field ' + key + '.');
        }

        if (!errors.some(err => err.includes(key))) {
          validObject[key] = value;
        }
      }
    }

    return validObject;
  }

  var errors = [];
  var validRequestBody = validateObject(requestBody, schema, errors);

  return {
    errors: errors.length > 0 ? errors : null,
    validRequestBody: validRequestBody
  };
};

```
## Usage in Apigee X

### JavaScript-1.js

This file shows an example of how to use the `validateRequestBody` function in an Apigee X proxy. The schema and request body are defined, and the validation function is called to validate the incoming request.

```javascript
var schema = {
  _anyOf: ['phone_number', 'policy_number'],
  phone_number: {
    type: "string",
    phone: true,
    required: false
  },
  policy_number: {
    type: "string",
    required: false,
    minLength: 5,
    maxLength: 15
  },
  gender: {
    type: "string",
    required: true,
    validValues: ["Male", "Female", "Other"]
  },
  age: {
    type: "number",
    required: true,
    min: 18,
    max: 99,
    round: true
  },
  birthdate: {
    type: "date",
    required: true,
    dateFormat: "yyyy-mm-dd"
  },
  address: {
    type: "object",
    required: true,
    properties: {
      street: {
        type: "string",
        required: true
      },
      city: {
        type: "string",
        required: true,
        maxLength: 50
      },
      zip_code: {
        type: "string",
        required: true,
        validValues: ["12345", "67890"]
      }
    }
  }
};

var requestBody = JSON.parse(context.getVariable("request.content"));
var validationResult = validator.validateRequestBody(requestBody, schema);

if (validationResult.errors) {
  context.setVariable("isError", true);
  context.setVariable("statusCode", 400);
  var responseBody = {
    status: "failed",
    responseCode: 400,
    message: validationResult.errors
  };
  context.setVariable("responseBody", JSON.stringify(responseBody));
} else {
  context.setVariable("isError", false);
}
```

## Apigee X Policies

### validate-requestBody.xml

This policy invokes the JavaScript-1.js file for request body validation.

```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Javascript continueOnError="false" enabled="true" timeLimit="200" name="validate-requestBody">
    <DisplayName>validate-requestBody</DisplayName>
    <Properties/>
    <ResourceURL>jsc://JavaScript-1.js</ResourceURL>
    <IncludeURL>jsc://JS-validation.js</IncludeURL>
</Javascript>
```

### RF-Validation-Error.xml

This policy handles validation errors and returns an appropriate response.

```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<RaiseFault continueOnError="false" enabled="true" name="RF-Validation-Error">
    <DisplayName>RF-Validation-Error</DisplayName>
    <Properties/>
    <FaultResponse>
        <Set>
            <Headers/>
            <Payload contentType="application/json">
                {responseBody}
            </Payload>
            <StatusCode>{statusCode}</StatusCode>
            <ReasonPhrase>Server Error</ReasonPhrase>
        </Set>
    </FaultResponse>
    <IgnoreUnresolvedVariables>true</IgnoreUnresolvedVariables>
</RaiseFault>
```

### ProxyEndpoint.xml

Defines the proxy endpoint configuration for request validation.

```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<ProxyEndpoint name="default">
    <PreFlow name="PreFlow">
        <Request>
            <Step>
                <Name>validate-requestBody</Name>
            </Step>
            <Step>
                <Condition>isError=true</Condition>
                <Name>RF-Validation-Error</Name>
            </Step>
        </Request>
        <Response/>
    </PreFlow>
    <Flows/>
    <PostFlow name="PostFlow">
        <Request/>
        <Response/>
    </PostFlow>
    <HTTPProxyConnection>
        <BasePath>/testvalidation</BasePath>
    </HTTPProxyConnection>
    <RouteRule name="default">
        <TargetEndpoint>default</TargetEndpoint>
    </RouteRule>
</ProxyEndpoint>
```

### TargetEndpoint.xml

Defines the target endpoint configuration.

```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<TargetEndpoint name="default">
    <PreFlow name="PreFlow">
        <Request/>
        <Response/>
    </PreFlow>
    <Flows/>
    <PostFlow name="PostFlow">
        <Request/>
        <Response/>
    </PostFlow>
    <HTTPTargetConnection>
        <URL>https://mocktarget.apigee.net/echo</URL>
    </HTTPTargetConnection>
</TargetEndpoint>
```


## Example Request

Send a request to the proxy endpoint with the following JSON body to test the validation:

```json
{
  "phone_number": "1234567890",
  "policy_number": "ABCDE12345",
  "gender": "Male",
  "age": 25,
  "birthdate": "1999-01-01",
  "address": {
    "street": "123 Main St",
    "city": "Springfield",
    "zip_code": "12345"
  }
}
```
## Contributors

- [Karthik V Rao](https://www.linkedin.com/in/karthik-v-rao-404760229)
- [Pavan Kumar Jogi](https://www.linkedin.com/in/pawan-kumar-j-3b5426242)


## Download

[Download the Proxy ZIP file](./apigee-validation.zip)



## License

This project is licensed under the MIT License.
