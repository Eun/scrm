build: bindata.go
	go-bindata -pkg scrm static
	go get github.com/Eun/scrm/cmd/scrm
	

.PHONY: build