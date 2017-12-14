package scrm

import (
	"crypto/rand"
	"encoding/json"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/bmizerany/pat"
	assetfs "github.com/elazarl/go-bindata-assetfs"
	"github.com/jcuga/golongpoll"
	_ "github.com/jteeuwen/go-bindata"
)

type Scrm struct {
	Rooms  []Room
	closed chan bool
	sync.Mutex
}

const (
	cookieRoomOptions  = "RoomOptions"
	kickTimerInterval  = time.Second * 2
	deleteRoomInterval = time.Hour * 4
	kickIdleAfter      = time.Minute * 60
)

type ErrWithMessageAndStatusCode struct {
	StatusCode int
	Message    string
}

func (e ErrWithMessageAndStatusCode) Error() string { return e.Message }

func New() (*Scrm, http.Handler, error) {

	var scrm Scrm

	pat := pat.New()
	pat.Get("/api/room/:id/:action", http.HandlerFunc(scrm.HandlerFunc))
	pat.Post("/api/room/:id/:action", http.HandlerFunc(scrm.HandlerFunc))

	mux := http.NewServeMux()
	mux.Handle("/api/", pat)
	mux.Handle("/", http.FileServer(&assetfs.AssetFS{Asset: Asset, AssetDir: AssetDir, AssetInfo: AssetInfo, Prefix: "static"}))

	return &scrm, mux, nil
}

func (s *Scrm) Run() error {
	kickTimer := time.NewTimer(kickTimerInterval)
	roomTimer := time.NewTimer(deleteRoomInterval)
	for {
		select {
		case <-kickTimer.C:
			s.kickIdleMembers()
			kickTimer = time.NewTimer(kickTimerInterval)
		case <-roomTimer.C:
			// remove empty rooms
			s.Lock()
			for i := 0; i < len(s.Rooms); i++ {
				if len(s.Rooms[i].Members) <= 0 {
					rooms := s.Rooms[:i]
					s.Rooms = append(rooms, s.Rooms[i+1:]...)
				}
			}
			s.Unlock()
			roomTimer = time.NewTimer(deleteRoomInterval)
		case <-s.closed:
			return nil
		}
	}
}

func (scrm *Scrm) Close() error {
	scrm.closed <- true
	return nil
}

func (scrm *Scrm) HandlerFunc(w http.ResponseWriter, req *http.Request) {
	params := req.URL.Query()
	id := params.Get(":id")
	action := strings.ToLower(params.Get(":action"))

	if len(id) <= 0 {
		http.Error(w, "ID cannot be empty!", http.StatusBadRequest)
		return
	}

	if id == "0" && action == "new" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(200)
		if err := json.NewEncoder(w).Encode(struct{ ID string }{scrm.getUnusedRoomID()}); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		return
	}

	room, err := scrm.createOrGetRoom(id, req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if action == "poll" {
		room.longPollManager.SubscriptionHandler(w, req)
		return
	}

	scrm.Lock()
	defer scrm.Unlock()
	switch action {
	case "join":
		room.memberJoin(w, req)
	case "leave":
		room.memberLeave(w, req)
	case "ping":
		room.memberPing(w, req)
	case "vote":
		room.memberVote(w, req)
	case "unvote":
		room.memberUnvote(w, req)
	case "reset":
		room.reset()
	case "finish":
		room.finish()
	case "options":
		room.setOptions(w, req)
	}
}

func (scrm *Scrm) kickIdleMembers() error {
	scrm.Lock()
	defer scrm.Unlock()

	//log.Println("Kicking idle Members...")
	for i := 0; i < len(scrm.Rooms); i++ {
		scrm.Rooms[i].kickIdleMembers()
	}

	return nil
}

func (scrm *Scrm) createOrGetRoom(id string, req *http.Request) (*Room, error) {
	scrm.Lock()
	defer scrm.Unlock()
	l := len(scrm.Rooms)
	for i := l - 1; i >= 0; i-- {
		if scrm.Rooms[i].ID == id {
			return &scrm.Rooms[i], nil
		}
	}
	manager, err := golongpoll.StartLongpoll(golongpoll.Options{}) // default options
	if err != nil {
		return nil, err
	}

	scrm.Rooms = append(scrm.Rooms, Room{
		ID:              id,
		longPollManager: manager,
	})
	scrm.Rooms[l].longPollManager.Publish("all", scrm.Rooms[l])
	return &scrm.Rooms[l], nil
}

var attributes = []string{
	"desert", "tundra", "mountain", "space", "field", "urban",
	"hidden", "covert", "uncanny", "scheming", "decisive", "untouchable", "stalking",
	"rowdy", "dangerous", "explosive", "threatening", "warring", "deadly", "killer", "insane", "wild",
	"bad", "unnecessary", "unknown", "unexpected", "waning",
	"amber", "bone", "coral", "ivory", "jet", "nacre", "pearl", "obsidian", "glass",
	"agate", "beryl", "diamond", "opal", "ruby", "onyx", "sapphire", "emerald", "jade",
	"red", "orange", "yellow", "green", "blue", "violet",
	"draconic", "wireless", "spinning", "falling", "orbiting", "hunting", "chasing", "searching", "revealing", "flying", "destroyed", "inconceivable", "tarnished",
}

var objects = []string{
	"panther", "wildcat", "tiger", "lion", "cheetah", "cougar", "leopard",
	"viper", "cottonmouth", "python", "boa", "sidewinder", "cobra",
	"grizzly", "jackal", "falcon",
	"wildebeest", "gazelle", "zebra", "elk", "moose", "deer", "stag", "pony", "koala", "sloth",
	"horse", "stallion", "foal", "colt", "mare", "yearling", "filly", "gelding",
	"mermaid", "unicorn", "fairy", "troll", "yeti", "pegasus", "griffin", "dragon",
	"nomad", "wizard", "cleric", "pilot", "captain", "commander", "general", "major", "admiral", "chef", "inspector",
	"mainframe", "device", "motherboard", "network", "transistor", "packet", "robot", "android", "cyborg", "display", "battery", "memory", "disk", "cartridge", "tape", "camera", "projector",
	"octopus", "lobster", "crab", "barnacle", "hammerhead", "orca", "piranha",
	"storm", "thunder", "lightning", "rain", "hail", "sun", "drought", "snow", "drizzle",
	"piano", "keyboard", "guitar", "trumpet", "trombone", "flute", "cornet", "horn", "tuba", "clarinet", "saxophone", "piccolo", "violin", "harp", "cello", "drum", "organ", "banjo", "rhythm", "beat", "sound", "song",
	"screwdiver", "sander", "lathe", "mill", "welder", "mask", "hammer", "drill", "compressor", "wrench", "mixer", "router", "vacuum",
	"warning", "presence", "weapon", "player", "ink", "case", "cup", "chain", "door",
}

func (scrm *Scrm) getUnusedRoomID() string {
	scrm.Lock()
	defer scrm.Unlock()
	for {

		a, err := rand.Int(rand.Reader, big.NewInt(int64(len(attributes))))
		if err != nil {
			panic(err)
		}
		o, err := rand.Int(rand.Reader, big.NewInt(int64(len(objects))))
		if err != nil {
			panic(err)
		}

		id := strings.ToUpper(attributes[a.Int64()]) + " " + strings.ToUpper(objects[o.Int64()])

		exists := false

		for _, r := range scrm.Rooms {
			if r.ID == id {
				exists = true
				break
			}
		}
		if exists == false {
			return id
		}
	}
}
