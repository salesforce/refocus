---
layout: docs
title: Creating A Sample Generator
---

# Creating A Sample Generator

## What Is A Sample Generator?

Glad you asked! A Sample Generator generates Samples... Ok, that isn't helpful. A Sample Generator is an object in Refocus that defines how you collect Samples for a defined set of Subjects and Aspects. Creating a Sample Generator is easy and allows you to immediately stream your real-time Sample data into Refocus.

## Prerequisites

1. Have an instance of Refocus running [link](https://salesforce.github.io/refocus/docs/03-quickstartheroku.html)
2. Have at least 1 collector deployed that is able to reach the data source you will be collecting from [link](https://github.com/salesforce/refocus-collector#installation)
3. Have a Sample Generator Template for the information you're trying to collect [link](https://github.com/salesforce/refocus-sample-generator-template-utils#refocus-sample-generator-template-utils-refocus-sample-generator-template-utilities)

## 5 Main Concepts You Need To Understand

### Subjects 

This tells the Sample Generator what Subjects you will be monitoring. You can define Subjects by EITHER
passing in a list of Subject Absolute Paths into the “subjects” array
OR
by defining a query in the “subjectQuery” string. The “subjectQuery” is inserted in the subjects API endpoint like so /v1/subjects/{subjectQuery} 

### Aspects

Pass in a list of Aspect names you want this Sample Generator to generate.

### Generator Template

The generator template is the logic behind the sample generators. It tells the generator how to get data and then how to transform that data into Refocus samples. You pass in the Generator Template name into the “generatorTemplate” field.

### Context Variable

Generator Templates are written to be generic and reusable. In order to tailor the template to your specific needs, the Generator Template will define some context variables that need to be filled out. Usually, this will include fields such as URL and Credentials.
Note: If the Sample Generator Template defines a context variable as “encrypted” then any values you specify for that context variable will be encrypted.

### Collectors

This tells us which collectors you want to use to collect your data and generate your samples. We suggest specifying at least 2 collectors so that we can automatically reassign your Sample Generator to a different collector if a collector stops unexpectedly.

## Creating A Sample Generator

```
POST {refocus_url}/v1/generators
```
```
{
  "description": "string", // What do people need to know about your Sample Generator?
  "helpEmail": "string", // Who should someone contact if things aren't behaving as expected?
  "helpUrl": "string", // How can someone get more information about your team or product?
  "name": "string", // A unique and descriptive name for your Sample Generator
  "subjectQuery": "string", // Either specify this or "subjects" (see above for details).
  "collectors": [ // List of collectors which are able to collect samples
    "string1",
    "string2"
  ],
  "subjects": [ // Either fill in this or "subjectQuery" (see above for details).
    "string"
  ],
  "aspects": [ // List of one or more Aspects you want to collect for
    "aspect1",
    "aspect2"
  ],
  "generatorTemplate": { // The name and version of the Sample Generator Template to use
    "name": "string",
    "version": "string" // version may include wildcard characters, ref. https://semver.org/
  },
  "tags": [ // An optional list of tags describing your Sample Generator
    "string1",
    "string2"
  ],
  "context": {} // Specify the values for any context variables as defined by the Sample Generator Template you are using.
}
```

