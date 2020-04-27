require('dotenv').config();
const express = require("express");
const router = express.Router();
const ClubData = require("../models/clubdata")
const mongoose = require('mongoose')
const segSchema = require("../models/segmentSchema")
const resultsSchema = require("../models/results")
const timeFrame = "this_week"
let segmentId;

router.post('/loadleaderboard', function (req, res) {
    loadLeaderboard('POST', segmentId, req.body.clubs, true, req.body.masters, req.body.gender, res, req)
})

router.get('/', (req, res) => {
    loadLeaderboard('GET', segmentId, 55274, false, 'false', '', res, req)
});

async function loadLeaderboard(type, segmentId, clubId, reload, ageFilter, gender, res, req) {
    var params = {
        "date_range": timeFrame
    }
    var params64 = {}
    var noOfResults = 30
    var segment = []
    var segmentInfo = []
    var implClubs = []
    var databaseLeaderboard = []
    var dayOne = [];
    var dayTwo = [];
    var dayThree = [];
    var dayFour = [];

    if (req.body.clubs != undefined) {
        clubName = "Public"
    }

    var strava = new require("strava")({
        "client_id": process.env.CLIENT_ID,
        "access_token": process.env.ACCESS_TOKEN,
        "client_secret": process.env.CLIENT_SECRET,
        "redirect_url": "https://www.stravasegmenthunter.com/"
    });

    findSegmentCodes(clubId)
    console.log(segmentId)

    //Gathering Club Data
    ClubData.find(async function (err, clubInfo) {
        if (err) {
            console.log(err)
        } else {
            for (let i = 0; i < clubInfo.length; i++) {
                implClubs.push([clubInfo[i].clubName, clubInfo[i].clubId, clubInfo[i].alais])
            }
        }

        SegmentData = mongoose.model(clubId + "segment", segSchema)

        SegmentData.find(async function (err, data) {
            if (err) {
                console.log(err)
            } else {
                try {
                    segmentInfo = {
                        "name": data[0].name,
                        "distance": data[0].distance,
                        "average_grade": data[0].grade,
                        "link": "https://www.strava.com/segments/" + data[0].segmentId,
                        "efforts": data[0].efforts,
                    }
                } catch {
                    segmentInfo = {
                        "name": "Contact your admin to update segments",
                        "distance": 0,
                        "average_grade": 0,
                        "link": "https://www.strava.com/segments/",
                        "efforts": 0,
                    }
                }

            }
        }).sort({
            counterId: 1
        }).exec(function (err, docs) {
            console.log(err);
        }); //Upcoming Segments

        console.log(segmentInfo)
    
        //Finding upcoming segments
        SegmentData.find(async function (err, data) {
            if (err) {
                console.log(err)
            } else {
                for (let i = 0; i < 5; i++) {
                    if (err) {
                        console.log(err)
                    } else {
                        try {
                            if (i == 1) {
                                dayOne = [data[1].name, "https://www.strava.com/segments/" + data[1].segmentId]
                            } else if (i == 2) {
                                dayTwo = [data[2].name, "https://www.strava.com/segments/" + data[2].segmentId]
                            } else if (i == 3) {
                                dayThree = [data[3].name, "https://www.strava.com/segments/" + data[3].segmentId]
                            } else if (i == 4) {
                                dayFour = [data[4].name, "https://www.strava.com/segments/" + data[4].segmentId]
                            }
                        } catch {
                            dayOne = ["No segment has been added", "https://www.strava.com/segments/"]
                            dayTwo = ["No segment has been added", "https://www.strava.com/segments/"]
                            dayThree = ["No segment has been added", "https://www.strava.com/segments/"]
                            dayFour = ["No segment has been added", "https://www.strava.com/segments/"]
                        }
                    }
                }
            }
        }).sort({
            counterId: 1
        }).exec(function (err, docs) {
            console.log(err);
        });

        if ((ageFilter === 'false') && (gender === '')) {
            //no age no gender
            params = {
                "date_range": timeFrame,
                "per_page": noOfResults,
                "club_id": clubId
            }

            strava.segments.leaderboard.get(segmentId, params, async function (err, data) {

                numberOfEntry = data.entries.length

                for (let i = 0; i < numberOfEntry; i++) {
                    segment.push([data.entries[i].athlete_name, convertSecondsToMinutes(data.entries[i].elapsed_time), data.entries[i].rank])
                }

                for (let i = 0; i < implClubs.length; i++) {
                    if (clubId == implClubs[i][1]) {
                        const collection = mongoose.model(implClubs[i][0], resultsSchema)
                        if (type === 'POST') {
                            collection.find(function (err, people) {
                                databaseLeaderboard = people

                                res.send({
                                    data: segment,
                                    segmentInfo: segmentInfo,
                                    dayOne: dayOne,
                                    dayTwo: dayTwo,
                                    dayThree: dayThree,
                                    dayFour: dayFour,
                                    clubId: clubId,
                                    reload: reload,
                                    masters: false,
                                    gender: gender,
                                    db: databaseLeaderboard,
                                    clubName: implClubs[i][2],
                                    clubInfo: implClubs
                                })
                            }).sort({
                                points: -1
                            }).exec(function (err, docs) {
                                console.log(err);
                            }); //collection
                        } else if (type === 'GET') {
                            collection.find(function (err, people) {
                                databaseLeaderboard = people

                                res.render('home', {
                                    data: segment,
                                    segmentInfo: segmentInfo,
                                    dayOne: dayOne,
                                    dayTwo: dayTwo,
                                    dayThree: dayThree,
                                    dayFour: dayFour,
                                    clubId: clubId,
                                    reload: reload,
                                    masters: false,
                                    gender: gender,
                                    db: databaseLeaderboard,
                                    clubName: implClubs[i][2],
                                    clubInfo: implClubs
                                })
                            }).sort({
                                points: -1
                            }).exec(function (err, docs) {
                                console.log(err);
                            }); //collection
                        } //Type Check
                    } //Club Check
                } //For
            }) //Api call
        } else if ((ageFilter === 'false') && (gender != '')) {
            //no age but gender
            params = {
                "date_range": timeFrame,
                "per_page": noOfResults,
                "club_id": clubId,
                "gender": gender
            }

            strava.segments.leaderboard.get(segmentId, params, async function (err, data) {
                numberOfEntry = data.entries.length

                for (let i = 0; i < numberOfEntry; i++) {
                    segment.push([data.entries[i].athlete_name, convertSecondsToMinutes(data.entries[i].elapsed_time), data.entries[i].rank])
                }

                for (let i = 0; i < implClubs.length; i++) {
                    if (clubId == implClubs[i][1]) {
                        const collection = mongoose.model(implClubs[i][0] + gender, resultsSchema)
                        if (type === 'POST') {
                            collection.find(function (err, people) {
                                databaseLeaderboard = people

                                res.send({
                                    data: segment,
                                    segmentInfo: segmentInfo,
                                    dayOne: dayOne,
                                    dayTwo: dayTwo,
                                    dayThree: dayThree,
                                    dayFour: dayFour,
                                    clubId: clubId,
                                    reload: reload,
                                    masters: false,
                                    gender: gender,
                                    db: databaseLeaderboard,
                                    clubName: implClubs[i][2],
                                    clubInfo: implClubs
                                })
                            }).sort({
                                points: -1
                            }).exec(function (err, docs) {
                                console.log(err);
                            }); //collection
                        } else if (type === 'GET') {
                            collection.find(function (err, people) {
                                databaseLeaderboard = people

                                res.render('home', {
                                    data: segment,
                                    segmentInfo: segmentInfo,
                                    dayOne: dayOne,
                                    dayTwo: dayTwo,
                                    dayThree: dayThree,
                                    dayFour: dayFour,
                                    clubId: clubId,
                                    reload: reload,
                                    masters: false,
                                    gender: gender,
                                    db: databaseLeaderboard,
                                    clubName: implClubs[i][2],
                                    clubInfo: implClubs
                                })
                            }).sort({
                                points: -1
                            }).exec(function (err, docs) {
                                console.log(err);
                            }); //collection
                        } //Type Check
                    } //Club Check
                } //For
            }) //Api call
        } else if ((ageFilter === 'true') && (gender === '')) {
            //age but no gender
            params = {
                "date_range": timeFrame,
                "per_page": noOfResults,
                "club_id": clubId,
                "age_group": "45_54"
            }

            params64 = {
                "date_range": timeFrame,
                "per_page": noOfResults,
                "club_id": clubId,
                "age_group": "55_64"
            }

            strava.segments.leaderboard.get(segmentId, params, async function (err, data) {
                numberOfEntry = data.entries.length

                for (let i = 0; i < numberOfEntry; i++) {
                    segment.push([data.entries[i].athlete_name, data.entries[i].elapsed_time, data.entries[i].rank])
                }

                strava.segments.leaderboard.get(segmentId, params64, async function (err, data) {
                    numberOfEntry = data.entries.length

                    for (let i = 0; i < numberOfEntry; i++) {
                        segment.push([data.entries[i].athlete_name, data.entries[i].elapsed_time, data.entries[i].rank])
                    }

                    segment.sort(sortFunctionClub);
                    for (let i = 0; i < segment.length; i++) {
                        segment[i][2] = i + 1
                        segment[i][1] = convertSecondsToMinutes(segment[i][1])
                    }

                    for (let i = 0; i < implClubs.length; i++) {
                        if (clubId == implClubs[i][1]) {
                            const collection = mongoose.model(implClubs[i][0] + "master", resultsSchema)
                            if (type === 'POST') {
                                collection.find(function (err, people) {
                                    databaseLeaderboard = people

                                    res.send({
                                        data: segment,
                                        segmentInfo: segmentInfo,
                                        dayOne: dayOne,
                                        dayTwo: dayTwo,
                                        dayThree: dayThree,
                                        dayFour: dayFour,
                                        clubId: clubId,
                                        reload: reload,
                                        masters: false,
                                        gender: gender,
                                        db: databaseLeaderboard,
                                        clubName: implClubs[i][2],
                                        clubInfo: implClubs
                                    })
                                }).sort({
                                    points: -1
                                }).exec(function (err, docs) {
                                    console.log(err);
                                }); //collection
                            } else if (type === 'GET') {
                                collection.find(function (err, people) {
                                    databaseLeaderboard = people

                                    res.render('home', {
                                        data: segment,
                                        segmentInfo: segmentInfo,
                                        dayOne: dayOne,
                                        dayTwo: dayTwo,
                                        dayThree: dayThree,
                                        dayFour: dayFour,
                                        clubId: clubId,
                                        reload: reload,
                                        masters: false,
                                        gender: gender,
                                        db: databaseLeaderboard,
                                        clubName: implClubs[i][2],
                                        clubInfo: implClubs
                                    })
                                }).sort({
                                    points: -1
                                }).exec(function (err, docs) {
                                    console.log(err);
                                }); //collection
                            } //Type Check
                        } //Club Check
                    } //For
                }) //Api call 54
            }) //Api call 64
        } else if ((ageFilter === 'true') && (gender != '')) {
            //age and gender
            //age but no gender
            params = {
                "date_range": timeFrame,
                "per_page": noOfResults,
                "club_id": clubId,
                "age_group": "45_54",
                "gender": gender
            }

            params64 = {
                "date_range": timeFrame,
                "per_page": noOfResults,
                "club_id": clubId,
                "age_group": "55_64",
                "gender": gender
            }

            strava.segments.leaderboard.get(segmentId, params, async function (err, data) {
                numberOfEntry = data.entries.length

                for (let i = 0; i < numberOfEntry; i++) {
                    segment.push([data.entries[i].athlete_name, data.entries[i].elapsed_time, data.entries[i].rank])
                }

                strava.segments.leaderboard.get(segmentId, params64, async function (err, data) {
                    numberOfEntry = data.entries.length

                    for (let i = 0; i < numberOfEntry; i++) {
                        segment.push([data.entries[i].athlete_name, data.entries[i].elapsed_time, data.entries[i].rank])
                    }

                    segment.sort(sortFunctionClub);
                    for (let i = 0; i < segment.length; i++) {
                        segment[i][2] = i + 1
                        segment[i][1] = convertSecondsToMinutes(segment[i][1])
                    }

                    for (let i = 0; i < implClubs.length; i++) {
                        if (clubId == implClubs[i][1]) {
                            const collection = mongoose.model(implClubs[i][0] + "master" + gender, resultsSchema)
                            if (type === 'POST') {
                                collection.find(function (err, people) {
                                    databaseLeaderboard = people

                                    res.send({
                                        data: segment,
                                        segmentInfo: segmentInfo,
                                        dayOne: dayOne,
                                        dayTwo: dayTwo,
                                        dayThree: dayThree,
                                        dayFour: dayFour,
                                        clubId: clubId,
                                        reload: reload,
                                        masters: false,
                                        gender: gender,
                                        db: databaseLeaderboard,
                                        clubName: implClubs[i][2],
                                        clubInfo: implClubs
                                    })
                                }).sort({
                                    points: -1
                                }).exec(function (err, docs) {
                                    console.log(err);
                                }); //collection
                            } else if (type === 'GET') {
                                collection.find(function (err, people) {
                                    databaseLeaderboard = people

                                    res.render('home', {
                                        data: segment,
                                        segmentInfo: segmentInfo,
                                        dayOne: dayOne,
                                        dayTwo: dayTwo,
                                        dayThree: dayThree,
                                        dayFour: dayFour,
                                        clubId: clubId,
                                        reload: reload,
                                        masters: false,
                                        gender: gender,
                                        db: databaseLeaderboard,
                                        clubName: implClubs[i][2],
                                        clubInfo: implClubs
                                    })
                                }).sort({
                                    points: -1
                                }).exec(function (err, docs) {
                                    console.log(err);
                                }); //collection
                            } //Type Check
                        } //Club Check
                    } //For
                }) //Api call 54
            }) // Api call 64
        } //over looking if
    })
} // function

function findSegmentCodes(clubId) {
    const SegmentInfo = mongoose.model(clubId + "segment", segSchema)

    SegmentInfo.find(function (err, data) {
        if (err) {
            console.log(err)
        } else {
            try {
                segmentId = data[0].segmentId
            } catch {
                segmentId = -1
            }
        }
    }).sort({
        counterId: 1
    }).exec(function (err, docs) {
        console.log(err);
    });
}

module.exports = router