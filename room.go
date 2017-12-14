package scrm

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/jcuga/golongpoll"
)

type Room struct {
	ID              string
	Members         []Member
	Options         interface{}
	longPollManager *golongpoll.LongpollManager
	Estimated       bool
}

func (room *Room) memberJoin(w http.ResponseWriter, req *http.Request) {
	member, err := parseNewMember(req)
	if err != nil {
		if e, ok := err.(ErrWithMessageAndStatusCode); ok {
			http.Error(w, e.Message, e.StatusCode)
		} else {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
		return
	}

renameMember:
	for _, m := range room.Members {
		if strings.EqualFold(m.Name, member.Name) {
			member.Name += "2"
			goto renameMember
		}
	}

	var buf [8]byte
generateMemberID:
	rand.Read(buf[:])
	member.id = hex.EncodeToString(buf[:])
	for _, m := range room.Members {
		if strings.EqualFold(m.id, member.id) {
			goto generateMemberID
		}
	}

	member.active = time.Now()
	log.Printf("Member `%s' (%s) joined.\n", member.Name, member.id)
	room.Members = append(room.Members, *member)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(200)
	if err := json.NewEncoder(w).Encode(struct {
		ID   string
		Name string
	}{
		ID:   member.id,
		Name: member.Name,
	}); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	room.longPollManager.Publish("all", *room)
}

func (room *Room) memberLeave(w http.ResponseWriter, req *http.Request) {
	memberID, err := parseMemberID(req)
	if err != nil {
		if e, ok := err.(ErrWithMessageAndStatusCode); ok {
			http.Error(w, e.Message, e.StatusCode)
		} else {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
		return
	}

	for i := 0; i < len(room.Members); i++ {
		if room.Members[i].id == memberID {
			log.Printf("Member `%s' (%s) left.\n", room.Members[i].Name, room.Members[i].id)
			room.Members = append(room.Members[:i], room.Members[i+1:]...)
			room.longPollManager.Publish("all", *room)
			return
		}
	}
}

func (room *Room) memberPing(w http.ResponseWriter, req *http.Request) {
	memberID, err := parseMemberID(req)
	if err != nil {
		if e, ok := err.(ErrWithMessageAndStatusCode); ok {
			http.Error(w, e.Message, e.StatusCode)
		} else {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
		return
	}

	for i := 0; i < len(room.Members); i++ {
		if room.Members[i].id == memberID {
			room.Members[i].active = time.Now()
			log.Printf("Member `%s' (%s) ping.\n", room.Members[i].Name, room.Members[i].id)
			w.WriteHeader(http.StatusOK)
			return
		}
	}
	w.WriteHeader(http.StatusNotFound)
}

func (room *Room) memberVote(w http.ResponseWriter, req *http.Request) {
	memberID, err := parseMemberID(req)
	if err != nil {
		if e, ok := err.(ErrWithMessageAndStatusCode); ok {
			http.Error(w, e.Message, e.StatusCode)
		} else {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
		return
	}

	value, err := parseEstimatedValue(req)
	if err != nil {
		if e, ok := err.(ErrWithMessageAndStatusCode); ok {
			http.Error(w, e.Message, e.StatusCode)
		} else {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
		return
	}

	for i := 0; i < len(room.Members); i++ {
		if room.Members[i].id == memberID {
			room.Members[i].active = time.Now()
			room.Members[i].Estimated = true
			room.Members[i].EstimatedValue = value
			log.Printf("Member `%s' (%s) voted.\n", room.Members[i].Name, room.Members[i].id)
			room.longPollManager.Publish("all", room)
			return
		}
	}
}

func (room *Room) memberUnvote(w http.ResponseWriter, req *http.Request) {
	memberID, err := parseMemberID(req)
	if err != nil {
		if e, ok := err.(ErrWithMessageAndStatusCode); ok {
			http.Error(w, e.Message, e.StatusCode)
		} else {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
		return
	}

	for i := 0; i < len(room.Members); i++ {
		if room.Members[i].id == memberID {
			room.Members[i].active = time.Now()
			room.Members[i].Estimated = false
			log.Printf("Member `%s' (%s) unvoted.\n", room.Members[i].Name, room.Members[i].id)
			room.longPollManager.Publish("all", room)
			return
		}
	}
}

func (room *Room) kickIdleMembers() error {
	kickAfter := time.Now().Add(-kickIdleAfter)

	kickedMembers := false
	for j := len(room.Members) - 1; j >= 0; j-- {
		if room.Members[j].active.Before(kickAfter) {
			log.Printf("Member `%s' (%s) kicked.\n", room.Members[j].Name, room.Members[j].id)
			room.Members = append(room.Members[:j], room.Members[j+1:]...)
			kickedMembers = true
		}
	}
	if kickedMembers {
		room.longPollManager.Publish("all", room)
	}

	return nil
}

func (room *Room) reset() {
	for i := 0; i < len(room.Members); i++ {
		room.Members[i].Estimated = false
	}
	room.Estimated = false
	room.longPollManager.Publish("all", *room)
}

func (room *Room) finish() {
	room.Estimated = true
	room.longPollManager.Publish("all", *room)
}
func (room *Room) setOptions(w http.ResponseWriter, req *http.Request) {

	body, err := getBody(req)
	if err != nil {
		if e, ok := err.(ErrWithMessageAndStatusCode); ok {
			http.Error(w, e.Message, e.StatusCode)
		} else {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
		return
	}

	if err = json.Unmarshal(body, &room.Options); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	room.longPollManager.Publish("all", *room)
}
