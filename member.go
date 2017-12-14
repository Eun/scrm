package scrm

import "time"

type Member struct {
	Name           string
	id             string
	active         time.Time
	Estimated      bool
	EstimatedValue int
}
