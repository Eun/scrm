package scrm

import (
	"context"
	"encoding/json"
	"io/ioutil"
	"net/http"
	"strings"
)

type contextKey int

const bodyKey contextKey = iota

func getBody(r *http.Request) (bytes []byte, err error) {
	if r.Body == nil {
		return nil, nil
	}
	body := r.Context().Value(bodyKey)
	if body == nil {
		bytes, err = ioutil.ReadAll(r.Body)
		if err != nil {
			return nil, err
		}
		*r = *r.WithContext(context.WithValue(r.Context(), bodyKey, bytes))
		return bytes, err
	}
	return body.([]byte), nil
}

func parseMemberID(req *http.Request) (string, error) {
	if req.Method != http.MethodPost {
		return "", ErrWithMessageAndStatusCode{
			Message:    "Method should be POST",
			StatusCode: http.StatusBadRequest,
		}
	}

	var member struct {
		ID string
	}

	body, err := getBody(req)
	if err != nil {
		return "", ErrWithMessageAndStatusCode{
			Message:    "Unable to get body",
			StatusCode: http.StatusInternalServerError,
		}
	}

	if err := json.Unmarshal(body, &member); err != nil {
		return "", ErrWithMessageAndStatusCode{
			Message:    "Invalid Member",
			StatusCode: http.StatusBadRequest,
		}
	}
	return member.ID, nil
}

func parseNewMember(req *http.Request) (*Member, error) {
	if req.Method != http.MethodPost {
		return nil, ErrWithMessageAndStatusCode{
			Message:    "Method should be POST",
			StatusCode: http.StatusBadRequest,
		}
	}

	var member struct {
		Name string
	}

	body, err := getBody(req)
	if err != nil {
		return nil, ErrWithMessageAndStatusCode{
			Message:    "Unable to get body",
			StatusCode: http.StatusInternalServerError,
		}
	}
	if err := json.Unmarshal(body, &member); err != nil {
		return nil, ErrWithMessageAndStatusCode{
			Message:    "Invalid Member",
			StatusCode: http.StatusBadRequest,
		}
	}

	member.Name = strings.TrimSpace(member.Name)
	if len(member.Name) <= 0 {
		return nil, ErrWithMessageAndStatusCode{
			Message:    "Invalid Name",
			StatusCode: http.StatusBadRequest,
		}
	}

	return &Member{
		Name: member.Name,
	}, nil
}

func parseEstimatedValue(req *http.Request) (int, error) {
	if req.Method != http.MethodPost {
		return 0, ErrWithMessageAndStatusCode{
			Message:    "Method should be POST",
			StatusCode: http.StatusBadRequest,
		}
	}

	var request struct {
		Value int
	}

	body, err := getBody(req)
	if err != nil {
		return 0, ErrWithMessageAndStatusCode{
			Message:    "Unable to get body",
			StatusCode: http.StatusInternalServerError,
		}
	}

	if err := json.Unmarshal(body, &request); err != nil {
		return 0, ErrWithMessageAndStatusCode{
			Message:    "Invalid Value",
			StatusCode: http.StatusBadRequest,
		}
	}
	return request.Value, nil
}
