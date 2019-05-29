const random_words = require('random-words');
const datamuse = require('datamuse');
const bot_util = require('bot-util');

function GenerateSentence() {
    return new Promise((resolve, reject) => {
        let baseWord = random_words();
        let sentence = baseWord;
        datamuse.words({
            rel_rhy: baseWord
        }).then(words => {
            let rhyme = words[Math.floor(Math.random() * words.length)];
            sentence += ` rhymes with ${rhyme.word}`;
            resolve({
                type: 'text',
                message: sentence,
                onPosted: res => {
                    console.log(`Posted. ID: ${res.id}`);
                }
            });
        });
    });
}

const { parse } = require('url');
module.exports = async (req, res) => {
    const { query } = parse(req.url, true);
    const { secret } = query;
    if(secret == process.env.REQ_SECRET) {
        bot_util.facebook.AddPage(449469508916064, process.env.FB_TOKEN, 'RhymeBot').then(id => {
            GenerateSentence().then(object => {
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