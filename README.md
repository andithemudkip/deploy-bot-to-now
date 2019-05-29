# Deploying Facebook bots to Now [Node.js]



## Introduction

This guide will walk you through the process of taking the bot we build previously in my [first tuturial](https://github.com/andithemudkip/facebook-bots-guide) and deploying it to [Now][Now], so if you're just starting out I recommend following that tutorial first.

If you did not follow that tutorial but still have a bot ready to go, most of this tutorial should still apply.

## Prerequisites

- download & install [Now][Now] and create an account for the platform.

## Getting started (Now config)

Firstly we will need to open our bot folder in a code editor (I use Visual Studio Code) and create a new file called `now.json` - this will be the configuration file that Now will use! <br/>Inside it we're going to write:

```json
{
	"name": "rhymebot",
	"version": 2
}
```

`"name"` is the name of our application / bot <br/>`"version"` tells Now what version of the platform to use (version 1 is deprecated, version 2 is the recommended one to use!)

We can now open up a terminal (you can do that in Visual Studio Code by pressing `ctrl + ~`), typing

```sh
$ now dev
```

and pressing enter. This command emulates the Now platform _locally_, on your computer. We can use it to test our application without needing to deploy it to the cloud.

You should see something similar to this in the console.

![Ready! Available at http://localhost:3000](https://i.imgur.com/vKPOiVB.png)

If we open that link in a browser we should see the contents of our bot folder.

## Handling requests

The fact that Now is a serverless platform means that we can't have one script running 24/7 (as you'd imagine a bot should), so, to overcome this, we are going to make our bot generate a rhyme and post whenever it receives an  `http request`. 

We can go into our `index.js` file (our bot's code) and get rid of the part that handles posting to Facebook (for now)

```js
// we can comment this out
/*
bot_util.facebook.AddPage(PAGEID, ACCESSTOKEN, 'RhymeBot').then(id => {
    bot_util.facebook.pages[id].SchedulePost('0 0 * * * *', GenerateSentence);
});
*/
```

and, at the bottom of our file, we will add the function that gets called whenever a `request` is sent to our script

```js
module.exports = async (req, res) => {
    res.end('Hello there!');
}
```

`req` is the request that is received <br/>`res` is the response that the server will send back to the client (in this case we are sending back "Hello there!")

In order for Now to know how to interpret this file, though, we will need to modify our `now.json` file and include which files it needs to `build` using what `builder`. <br/>Before editing the `now.json` file we need to shut down the server by going into the terminal and pressing `ctrl + c`. It should say `Stopping now dev server`. (this is not needed when editing other files, only the `now.json` file)

Open up the file and add:

```json
{
    "name": "rhymebot",
    "version": 2,
    "builds": [
        { "src": "*.js", "use": "@now/node" }
    ]
}
```

This tells it to build any file with the `.js` extension using the `@now/node` builder.

We can now start our server back up with

```sh
$ now dev
```

and, if we navigate to http://localhost:3000/index.js (and wait a couple seconds until Now installs the builders and builds our script) we should see that our script is indeed working (it greets us with "Hello there!")

## Security (secret environment variables)

Now, because any request to our script will (ultimately) cause it to post to the Facebook page, we need some security measures in place that only let *you* post, and not anyone else. For this we are going to be using secret environment variables. One variable will hold a secret key and our script will compare the request parameters with that variable.

For now, because we are running locally, we will be storing our environment variables in a `.env` file. (later on, when deploying to Now, we won't need this file anymore)

Create a new file called `.env` in your project's folder and write

```
FB_TOKEN=your_fb_token
REQ_SECRET=your_secret
```

`FB_TOKEN` is the variable that holds your Facebook token <br/>`REQ_SECRET` is the variable that will hold our custom secret (you can set it to whatever you like - think of it as a password)

Now, in our code, we can use `process.env.FB_TOKEN` and `process.env.REQ_SECRET` to access the values of these two variables. (don't forget to save the `.env` file and restart the server!)

In our script we can now do something like

```js
//import the `parse` method from the `url` module
const { parse } = require('url');
module.exports = async (req, res) => {
    //get the query parameter from the request url
    const { query } = parse(req.url, true);
    //get the `secret` parameter of the query
    const { secret } = query;
    //check if it matches with the env variable
    if(secret == process.env.REQ_SECRET) {
        res.end('secret is correct!');
    } else {
        res.end('Unauthorized!');
    }
}
```

this will parse the request and look for a parameter called `secret`, then check if that matches our secret variable. Save the file and navigate to http://localhost:3000/index.js?secret=your_secret <br/>it should say "secret is correct!"; try changing the secret in the URL and see what happens!

## Posting

For posting we will be reusing some of the code we commented at the beginning.

```js
const { parse } = require('url');
module.exports = async (req, res) => {
    const { query } = parse(req.url, true);
    const { secret } = query;
    if(secret == process.env.REQ_SECRET) {
        //add the page to bot-util
        bot_util.facebook.AddPage(PAGEID, process.env.FB_TOKEN, 'RhymeBot').then(id => {
            //generate the sentence
            GenerateSentence().then(object => {
                //post the sentence to the page
                bot_util.facebook.pages[id].Post(object).then(post => {
                    res.end(`posted! id: ${post.id}`)
                }).catch(err => {
                    res.end(err.toString());
                });
            });
        });
    } else {
        res.end('Unauthorized!');
    }
}
```

Now, every time we visit http://localhost:3000/index.js?secret=your_secret the script will post a randomly generate rhyme to the Facebook page (if the secret matches the one in the `.env` file).

## Deploying to Now

Okay, maybe not *yet* <br/>Before deploying, we need to tell Now not to upload the `.env` file, but rather to use its own env variables that we will define in `now.json`.

First, create a new file called `.nowignore`: every file or folder we define in this file will be ignored by Now when deploying. <br/>Inside the file we will write only

```
.env
```

This ensures that the `.env` file will not be uploaded to Now when deploying. <br/>Instead, we want to define our environment variables inside `now.json` like so:

```json
{
    "name": "rhymebot",
    "version": 2,
    "builds": [
        { "src": "*.js", "use": "@now/node" }
    ],
    "env": {
        "FB_TOKEN": "@rhyme-fb-token",
        "REQ_SECRET": "@rhyme-req-secret"
    }
}
```

!!`@rhyme-fb-token` and `@rhyme-req-secret` are just the names of the secrets, not the secrets themselves!! <br/>In order to add the secrets we need to go back to the terminal (make sure the server isn't running) and type

```sh
$ now secrets add rhyme-fb-token your_fb_token
```

and

```sh
$ now secrets add rhyme-req-secret your_secret
```

Now we are finally ready to deploy! <br/>Go back to the terminal [make sure you're logged into Now (if you're not, do `now login` and follow the steps)] and just type

```sh
$ now
```

You should see something like this in the console

![Now Deployment Logs](https://i.imgur.com/3MIYAf7.png)

if we navigate to that URL + `/index.js/?secret=your_secret' you should see that it is posting to Facebook every time you refresh!

## Setting up EasyCron

At the moment, our bot does everything it should, except we have to manually request each post. This is where EasyCron comes in.

So, let's go to the Zeit [Integrations](https://zeit.co/dashboard/integrations) page and click on "Browse Marketplace". Here we need to find the "EasyCron" integration, open it and click on "Add".

When it asks for **read and write access**, select your name and click "Add".

Now we are prompted to add an API token; so, [create an account](https://www.easycron.com/user) on EasyCron then go to the API page (you can find it on the left side menu) and copy the API Token.

Go back to Zeit, paste your API Token, and click "Connect".

In the bottom-left side we need to select our "rhymebot" project, then, just click on the "Create a new cron job" button.

Give the cron job a name so that you remember what it does, I'll name it "Rhymebot Post"; <br/>In the "Cron path" input type "index.js" <br/>In the "Post data" input we'll type `secret=your_secret` <br/>And, finally, in the "Cron job execution time", we'll type `0 * * * *`, which means it will post once every hour.

And then click on "Create job".

And voila! Now our bot will be posting a randomly generated rhyme once an hour, and we don't need to host it on our PC!

## Warnings

Look closely at the EasyCron limitations! with the free tier you only get 200 executions a day and your account expires after one month - then you'll have to renew it!

Also look closely at the Now limitations! You only get 1000 requests per day for free, if you run lots of bots you might run out of requests!

[Now]: https://zeit.co/now	"Now"