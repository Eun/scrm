"use strict";

document.addEventListener("DOMContentLoaded", function(event) {
    const DefaultOptions = {
        EffortValues: [
            {
                Value: -1,
                Text: "---",
            },
            {
                Value: 2,
                Text: "≈1-2 Hours",
            },
            {
                Value: 3,
                Text: "≈2-3 Hours",
            },
            {
                Value: 5,
                Text: "≈½ Day",
            },
            {
                Value: 8,
                Text: "≈1 Day",
            },
            {
                Value: 13,
                Text: "≈1-2 Days",
            },
            {
                Value: 20,
                Text: "≈½ Week",
            },
            {
                Value: 35,
                Text: "≈1 Week",
            },
            {
                Value: 55,
                Text: "≈1-2 Weeks",
            },
            {
                Value: 90,
                Text: "≈2-3 Weeks",
            },
            {
                Value: 140,
                Text: "≈3-4 Weeks",
            },
            {
                Value: 230,
                Text: "≈1-2 Months",
            },
            {
                Value: 370,
                Text: "≈2-3 Months",
            },
            {
                Value: 600,
                Text: "≈½ Year",
            }
        ]
    };
    const Room = {
        template: `
            <div>
                <header>
                    <div>
                        <h2 v-if="ID">scrm - {{ ID }}</h2>
                        <h2 v-else>scrm</h2>
                        <div>
                            <a class="btn" v-on:click.prevent="window.open('#'+$route.path+'?compact=1', 'scrm','height=600,width=400,toolbar=0,menubar=0,location=0,status=0,directories=0,scrollbars=1,resizeable=1');" v-if="$route.query.compact === undefined">Compact Mode</a>
                            <a class="btn" v-on:click.prevent="$router.push('/room/0')">New Room</a>

                            <template v-if="ID">
                                <a class="btn" v-on:click.prevent="ShowQrDialog = true"><span class="qrcode"></span></a>
                                <template v-if="MemberID">
                                    <a class="btn" v-on:click.prevent="LeaveRoom">Leave</a>
                                </template>
                                <template v-else>
                                    <a class="btn" v-on:click.prevent="ShowJoinDialog = true">Join</a>
                                </template>
                                <template v-if="RoomData">
                                    <a class="btn" v-on:click.prevent="Reset" v-show="MemberID == null" v-if="RoomData.Estimated">Reset</a>
                                    <a class="btn" v-on:click.prevent="Finish" v-show="MemberID == null" v-if="!RoomData.Estimated">Finish Poll</a>
                                </template>
                            </template>
                        </div>
                    </div>
                </header>
                <main v-if="ID">
                    <h2 v-if="Error">{{Error}}</h2>
                    <template v-if="RoomData">
                        <div class="overview">
                            <div class="vote" v-show="MemberID && !RoomData.Estimated">
                                <template v-if="MemberID && !RoomData.Estimated">
                                    <div class="select" v-on:click.prevent="Unvote(); ShowVoteDialog = true">{{getText(EstimatedValue)}}</div>                              
                                </template>
                            </div>
                            <div class="members">
                                <div v-if="!RoomData.Members || RoomData.Members.length <= 0">
                                    No members
                                </div>
                                <ul>
                                    <li v-for="member in RoomData.Members">
                                        <span class="name">{{ member.Name }}</span>
                                        <template v-if="RoomData.Estimated">
                                            <template v-if="member.Estimated">
                                                <span>
                                                    <template v-if="member.EstimatedValue >= 0">
                                                        {{ member.EstimatedValue }}
                                                    </template>
                                                </span>
                                                <span class="text">{{ getText(member.EstimatedValue) }}</span>
                                            </template>
                                            <template v-else>
                                                <span></span>
                                                <span class="notvoted">Not voted</span>
                                            </template>
                                        </template>
                                        <template v-else>
                                            <template v-if="member.Estimated">
                                                <span>&nbsp;</span>
                                                <span class="text">✔</span>
                                            </template>
                                            <template v-else>
                                                <span></span>
                                                <span class="text">
                                                    <span class="spinner">
                                                        <span class="double-bounce1"></span>
                                                        <span class="double-bounce2"></span>
                                                    </span>
                                                </span>
                                            </template>
                                        </template>
                                    </li>
                                </ul>
                            </div>
                            <div class="results">
                                <template v-show="(RoomData.Estimated && RoomData.Result) || MemberID == null">
                                    <ul v-if="RoomData.Estimated && RoomData.Result">
                                        <li>
                                            <span>Min</span>
                                            <span>{{ RoomData.MinValue.Value }}</span>
                                            <span class="text">{{ RoomData.MinValue.Text }}</span>
                                            <span>#{{ RoomData.MinValue.Count }}</span>
                                        </li>
                                        <li>
                                            <span>Avg</span>
                                            <span>{{ RoomData.AvgValue }} ({{ RoomData.Result.Value }})</span>
                                            <span class="text result">{{ RoomData.Result.Text }}</span>
                                            <span>#{{ RoomData.Result.Count }}</span>
                                        </li>
                                        <!--<li>
                                            <span>Most</span>
                                            <span>{{ RoomData.Most.Value }}</span>
                                            <span class="text">{{ RoomData.Most.Text }}</span>
                                            <span>#{{ RoomData.Most.Count }}</span>
                                        </li>-->
                                        <li>
                                            <span>Max</span>
                                            <span>{{ RoomData.MaxValue.Value }}</span>
                                            <span class="text">{{ RoomData.MaxValue.Text }}</span>
                                            <span>#{{ RoomData.MaxValue.Count }}</span>
                                        </li>
                                    </ul>
                                </template>
                            </div>
                        </div>
                    </template>
                    <div class="dialogs">
                        <div class="dialog" v-show="ShowQrDialog">
                            <div class="outer" v-on:click.prevent="ShowQrDialog = false"></div>
                            <div class="inner">
                                <h1>{{ ID }}</h1>
                                <div class="qrcode"></div>
                                <a class="btn" v-on:click.prevent="ShowQrDialog = false">Ok</a>
                            </div>
                        </div>
                        <div class="dialog" v-show="ShowJoinDialog">
                            <div class="outer" v-on:click.prevent="ShowJoinDialog = false"></div>
                            <div class="inner">
                                <h1>Join Room</h1>
                                <input type="text" placeholder="Name" v-model="MemberName" v-on:keyup.enter.prevent="Join"/>
                                <a class="btn" v-on:click.prevent="ShowJoinDialog = false">Cancel</a>
                                <a class="btn" v-on:click.prevent="ShowJoinDialog = false; Join()">Join</a>
                            </div>
                        </div>
                        <div class="dialog" v-show="ShowVoteDialog" v-if="RoomData">
                            <div class="outer" v-on:click.prevent="ShowVoteDialog = false"></div>
                            <div class="inner">
                                <ul class="effortvalues">
                                    <li v-for="value in RoomData.Options.EffortValues" v-on:click.prevent="ShowVoteDialog = false; Vote(value.Value)" v-bind:class="{ active: value.Value == EstimatedValue }">
                                        {{ value.Text }}
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        `,
        data() {
            return {
                ID: "0",
                Loading: false,
                Error: null,
                RoomData: null,
                LastTime: 0,
                MemberID: null,
                MemberName: null,
                EstimatedValue: null,
                ShowJoinDialog: false,
                ShowVoteDialog: false,
                ShowQrDialog: false,
                PollingTask: undefined,
            }
        },
        created() {
            this.MemberName = this.getMemberName();
            this.navigated();
        },
        mounted() {
            this.sendPing();
        },
        watch: {
            '$route': 'navigated',
            ID: (val) => {
                var els = document.querySelectorAll(".qrcode");
                for (var i = 0; i < els.length; i++) {
                    els[i].innerHTML = "";
                    new window.QRCode(els[i], window.location.href);
                }
            },
        },
        methods: {
            navigated() {
                this.Error = null;
                this.Loading = true
                this.ID = this.$route.params.id;
                console.log("Navigated to ", this.$route.params);
                if (this.ID === "0") {
                    this.RoomData = null;
                    this.LastTime = 0;
                    this.MemberID = null;
                    this.MemberName = this.getMemberName();
                    this.EstimatedValue = null;
                    this.getNewRoomID((id, err) => {
                        this.Loading = false;
                        if (err) {
                            console.error("navigated: ", err);
                            this.Error = err.toString();
                        } else {
                            router.replace(`/room/${id}`);
                        }
                    })
                    return;
                }
                if (this.$route.params.action == "join") {
                    if (this.MemberID !== null && this.MemberID !== undefined) {
                        router.replace(`/room/${this.ID}`);
                        return
                    }
                    this.joinRoom((err) => {
                        if (err) {
                            console.error("navigated: ", err);
                            this.Error = err.toString();
                        } else {
                            router.replace(`/room/${this.ID}`);
                        }
                    })
                    return
                }

                if (this.MemberID === null || this.MemberID === undefined) {
                    var joinedRooms = {}
                    try {
                        joinedRooms = this.getCookie('JoinedRooms');
                    } catch (e) {
                        joinedRooms = {};
                    }
                    if (joinedRooms == null || joinedRooms == undefined) {
                        joinedRooms = {};
                    }

                    for (var id in joinedRooms) {
                        if (joinedRooms.hasOwnProperty(id)) {
                            if (id == this.ID) {
                                this.MemberID = joinedRooms[id].ID;
                                this.MemberName = joinedRooms[id].Name;
                            }
                        }
                    }
                }

                this.pollRoomData();
            },

            getNewRoomID(cb) {
                this.$http.get('api/room/0/new')
                .then(response => {
                    response.json()
                    .then(data => {
                        if (data.ID !== null) {
                            cb(data.ID, false);
                        } else {
                            cb(null, "Missing ID field");
                        }
                    })
                    .catch(err => {
                        cb(null, err);
                    })
                }, response => {
                    cb(null, response);
                });
            },
            joinRoom(cb) {
                this.setCookie('MemberName', {
                    MemberName: this.MemberName,
                });
                this.$http.post(`api/room/${this.ID}/join`, {Name: this.MemberName})
                .then(response => {
                    response.json()
                    .then(data => {
                        this.Loading = false
                        if (data.ID === null || data.ID === undefined) {
                            this.Error = "Missing 'ID' field";
                            return;
                        }
                        if (data.Name === null || data.Name === undefined) {
                            this.Error = "Missing 'Name' field";
                            return;
                        }
                        this.MemberID = data.ID;
                        this.MemberName = data.Name;

                        var joinedRooms = {};
                        try {
                            joinedRooms = this.getCookie('JoinedRooms');
                        } catch (e) {
                            joinedRooms = {};
                        }
                        if (joinedRooms == null || joinedRooms == undefined) {
                            joinedRooms = {};
                        }
                        joinedRooms[this.ID] = {
                            ID: this.MemberID,
                            Name: this.MemberName,
                        };
                        this.setCookie('JoinedRooms', joinedRooms);
                        cb(false);
                    })
                    .catch(err => {
                        this.Loading = false;
                        cb(err.toString());
                    })
                }, response => {
                    this.Loading = false;
                    cb(`${response.status} ${response.statusText}: ${response.bodyText}`);
                });
            },
            LeaveRoom() {
                if (this.MemberID === null || this.MemberID === undefined) {
                    return
                }

                var joinedRooms = {};
                try {
                    joinedRooms = this.getCookie('JoinedRooms');
                } catch (e) {
                    joinedRooms = {};
                }
                if (joinedRooms == null || joinedRooms == undefined) {
                    joinedRooms = {};
                }

                delete joinedRooms[this.ID];
                this.setCookie('JoinedRooms', joinedRooms);

                this.$http.post(`api/room/${this.ID}/leave`, {ID: this.MemberID})
                .then(response => {
                    this.Loading = false;
                    this.MemberID = null;
                    this.MemberName = this.getMemberName();
                    this.Error = null;
                }, response => {
                    this.Loading = false;
                    this.MemberID = null;
                    this.MemberName = this.getMemberName();
                    this.Error = `${response.status} ${response.statusText}: ${response.bodyText}`;
                });
            },
            pollRoomData() {
                if (this.ID == null || this.ID == undefined || this.PollingTask === this.LastTime) {
                    return;
                }
                this.PollingTask = this.LastTime;
                var id = this.ID;
                this.$http.get(`api/room/${this.ID}/poll?timeout=10&category=all&since_time=${this.LastTime}`)
                .then(response => {
                    response.json()
                    .then(data => {
                        if (id !== this.ID) {
                            return
                        }
                        this.Loading = false;
                        this.Error = this.parseEventData(data)
                        if (this.Error === false) {
                            this.pollRoomData();
                        }
                    })
                    .catch(err => {
                        if (id !== this.ID) {
                            return
                        }
                        this.Loading = false;
                        console.error(err);
                        this.Error = err.toString()
                    })
                }, response => {
                    if (id !== this.ID) {
                        return
                    }
                    this.Loading = false
                    this.Error = `${response.status} ${response.statusText}: ${response.bodyText}`;
                });
            },
            sendPing() {
                if (this.ID == null || this.ID == undefined || this.MemberID === null || this.MemberID === undefined) {
                    setTimeout(()=> {
                        this.sendPing();
                    }, 2000);
                    return;
                }
                this.$http.post(`api/room/${this.ID}/ping`, {ID: this.MemberID})
                .then(response => {
                    setTimeout(()=> {
                        this.sendPing();
                    }, 2000);
                }, response => {
                    if (response.status == 404) {
                        this.MemberName = this.getMemberName();
                        this.MemberID = null;
                        var joinedRooms = {};
                        try {
                            joinedRooms = this.getCookie('JoinedRooms');
                        } catch (e) {
                            joinedRooms = {};
                        }
                        if (joinedRooms == null || joinedRooms == undefined) {
                            joinedRooms = {};
                        }

                        delete joinedRooms[this.ID];
                        this.setCookie('JoinedRooms', joinedRooms);
                        setTimeout(()=> {
                            this.sendPing();
                        }, 2000);
                        return
                    }
                    console.error("Error (sendPing): ", response);
                    this.Error = `${response.status} ${response.statusText}: ${response.bodyText}`;
                });
            },

            setOptions(options) {
                if (this.ID == null || this.ID == undefined) {
                    return
                }
                this.$http.post(`api/room/${this.ID}/options`, options)
                .then(response => {
                }, response => {
                    console.error("Error (setOptions): ", response);
                    this.Error = `${response.status} ${response.statusText}: ${response.bodyText}`;
                });
            },

            

            parseEventData(data) {
                if (data.events === null || data.events === undefined || data.events.length <= 0) {
                    if (data.timestamp === null || data.timestamp === undefined) {
                        return "Missing timestamp field"
                    }
                    this.LastTime = data.timestamp;
                    return false;
                }
                var event = data.events[data.events.length-1];
                if (event.timestamp === null || event.timestamp === undefined) {
                    return "Missing timestamp field"
                }
                this.LastTime = event.timestamp;
                if (event.data.ID === null || event.data.ID === undefined) {
                    return "Missing ID field";
                }
                if (event.data.Estimated === null || event.data.Estimated === undefined) {
                    return "Missing Estimated field";
                }
                if (event.data.Options === null || event.data.Options === undefined) {
                    try {
                        event.data.Options = this.getCookie('Options');
                    } catch (e) {
                        event.data.Options = null;
                    }
                    
                    if (event.data.Options == null || event.data.Options == undefined) {
                        event.data.Options = DefaultOptions;
                        this.setCookie('Options', event.data.Options);
                    }
                }
                if (event.data.Options.EffortValues === null || event.data.Options.EffortValues === undefined) {
                    event.data.Options.EffortValues = DefaultOptions.EffortValues;
                }
                

                if (event.data.Members === null || event.data.Members === undefined) {
                    event.data.Members = [];
                }

                if (event.data.Estimated == true) {
                    event.data.MinValue = Number.MAX_SAFE_INTEGER;
                    event.data.MaxValue = Number.MIN_SAFE_INTEGER;
                    event.data.AvgValue = 0;
                    event.data.ValueCount = 0;
                    event.data.Result = null;
                    event.data.Most = null;
                    for (var i = 0; i < event.data.Members.length; i++) {
                        if (event.data.Members[i].Estimated == true && event.data.Members[i].EstimatedValue > 0) {
                            event.data.MinValue = Math.min(event.data.Members[i].EstimatedValue, event.data.MinValue);
                            event.data.MaxValue = Math.max(event.data.Members[i].EstimatedValue, event.data.MaxValue);
                            event.data.AvgValue += event.data.Members[i].EstimatedValue;
                            event.data.ValueCount++;
                        }
                    }

                    if (event.data.ValueCount > 0) {
                        event.data.AvgValue = event.data.AvgValue / event.data.ValueCount;
                        // find the closest value
                        var lastDiff = {
                            Diff: Number.MAX_SAFE_INTEGER,
                            Key: null,
                        };
                        for (var i = 0; i < event.data.Options.EffortValues.length; i++) {
                            var diff = event.data.Options.EffortValues[i].Value - event.data.AvgValue;
                            if (diff < 0) {
                                diff = diff * -1;
                            }
                            if (diff <= lastDiff.Diff) {
                                lastDiff = {
                                    Diff: diff,
                                    Key: i,
                                }
                            }
                        }

                        event.data.Result = {
                            Text: event.data.Options.EffortValues[lastDiff.Key].Text,
                            Value: event.data.Options.EffortValues[lastDiff.Key].Value,
                            Count: 0,
                        };

                        for (var i = 0; i < event.data.Options.EffortValues.length; i++) {
                            if (event.data.MinValue === event.data.Options.EffortValues[i].Value) {
                                event.data.MinValue = {
                                    Text: event.data.Options.EffortValues[i].Text,
                                    Value: event.data.Options.EffortValues[i].Value,
                                    Count: 0,
                                }
                            }
                            if (event.data.MaxValue === event.data.Options.EffortValues[i].Value) {
                                event.data.MaxValue = {
                                    Text: event.data.Options.EffortValues[i].Text,
                                    Value: event.data.Options.EffortValues[i].Value,
                                    Count: 0,
                                }
                            }
                        }

                        for (var i = 0; i < event.data.Members.length; i++) {
                            if (event.data.Members[i].Estimated === true && event.data.Members[i].EstimatedValue > 0) {
                                if (event.data.MinValue.Value === event.data.Members[i].EstimatedValue) {
                                    event.data.MinValue.Count++;
                                }
                                if (event.data.MaxValue.Value === event.data.Members[i].EstimatedValue) {
                                    event.data.MaxValue.Count++;
                                }
                                if (event.data.Result.Value === event.data.Members[i].EstimatedValue) {
                                    event.data.Result.Count++;
                                }
                            }
                        }

                        // sort members
                        event.data.Members.sort((a, b)=>{
                            return a.EstimatedValue > b.EstimatedValue
                        });


                    }
                }

                if (this.EstimatedValue == null) {
                    this.EstimatedValue = event.data.Options.EffortValues[0].Value;
                }

                // has everybody voted?
                if (event.data.Estimated === true) {
                    window.document.title = "scrm";
                } else {
                    var allVoted = event.data.Members.length > 0;
                    for (var i = 0; i < event.data.Members.length; i++) {
                        if (event.data.Members[i].Estimated !== true) {
                            allVoted = false;
                            break;
                        }
                    }
                    if (allVoted === true) {
                        window.document.title = "scrm ✔️";
                    } else {
                        window.document.title = "scrm ⚫";
                    }
                }
                this.RoomData = event.data;
                return false;
            },

            Finish(){
                this.$http.post(`api/room/${this.ID}/finish`, {ID: this.MemberID})
                .then(response => {
                }, response => {
                    console.error("Error (Finish): ", response);
                    this.Error = `${response.status} ${response.statusText}: ${response.bodyText}`;
                });
            },
            Reset(){
                this.$http.post(`api/room/${this.ID}/reset`, {ID: this.MemberID})
                .then(response => {
                }, response => {
                    console.error("Error (Reset): ", response);
                    this.Error = `${response.status} ${response.statusText}: ${response.bodyText}`;
                });
            },
            Vote(value) {
                if (value !== null && value !== undefined) {
                    this.EstimatedValue = value;
                    this.$http.post(`api/room/${this.ID}/vote`, {ID: this.MemberID, Value: this.EstimatedValue})
                    .then(response => {
                    }, response => {
                        console.error("Error (Vote): ", response);
                        this.Error = `${response.status} ${response.statusText}: ${response.bodyText}`;
                    });
                }
            },
            Unvote() {
                this.$http.post(`api/room/${this.ID}/unvote`, {ID: this.MemberID})
                .then(response => {
                }, response => {
                    console.error("Error (Unvote): ", response);
                    this.Error = `${response.status} ${response.statusText}: ${response.bodyText}`;
                });
            },
            Join(){
                if (this.MemberName === null || this.MemberName === undefined || this.MemberName.trim().length <= 0) {
                    this.MemberName = "User";
                }
                router.replace('/room/'+this.ID+'/join');
            },
            getText(val) {
                if (this.RoomData === null || this.RoomData === undefined) {
                    return "";
                }
                if (this.RoomData.Options === null || this.RoomData.Options === undefined) {
                    return "";
                }
                if (this.RoomData.Options.EffortValues === null || this.RoomData.Options.EffortValues === undefined) {
                    return "";
                }
                for (var i = 0; i < this.RoomData.Options.EffortValues.length; i++) {
                    if (val === this.RoomData.Options.EffortValues[i].Value) {
                        return this.RoomData.Options.EffortValues[i].Text;
                    }
                }
                return "";
            },
            getCookie(name) {
                var val = Cookie.get(name);
                if (val == null) {
                    return null;
                }

                return JSON.parse(decodeURIComponent(escape(atob(val))))
            },
            setCookie(name, val) {
                return Cookie.set(name, btoa(unescape(encodeURIComponent(JSON.stringify(val)))), {"expires": 365})
            },
            getMemberName() {
                var val = this.getCookie('MemberName');
                if (val !== null && val !== undefined && val.MemberName !== null && val.MemberName !== undefined) {
                    return val.MemberName;
                }
                return null;
            }
        }
    }

    const routes = [
        {
            path: '/',
            name: 'default',
            component: Room
        },
        {
            path: '/room/:id',
            name: 'room',
            component: Room
        },
        {
            path: '/room/:id/:action',
            name: 'roomWithAction',
            component: Room
        },
    ];

    const router = new VueRouter({
        routes
    });
        
    new Vue({router}).$mount('#app');
});