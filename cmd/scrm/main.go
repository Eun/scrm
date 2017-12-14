package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"

	"github.com/Eun/scrm"
)

func init() {
	runtime.GOMAXPROCS(runtime.NumCPU())
}

var addrFlag = flag.String("addr", "", "addr to use")
var portFlag = flag.Int("port", 0, "port to use")
var rootFlag = flag.String("root", "", "document root")

func main() {
	var err error
	flag.Parse()

	port := 0

	if portFlag != nil && *portFlag > 0 && *portFlag < 65536 {
		port = *portFlag
	} else {
		str := os.Getenv("PORT")
		if str == "" {
			str = os.Getenv("HTTP_PLATFORM_PORT")
			if str == "" {
				str = os.Getenv("ASPNETCORE_PORT")
				if str == "" {
					log.Fatal("$PORT must be set")
				}
			}
		}
		port, err = strconv.Atoi(str)
		if err != nil {
			log.Fatal(err)
		}
	}
	var addr string
	if addrFlag != nil && len(*addrFlag) > 0 {
		addr = *addrFlag
	}

	addr = fmt.Sprintf("%s:%d", addr, port)

	s, handler, err := scrm.New()
	if err != nil {
		log.Fatal(err)
	}
	defer s.Close()
	go func() {
		err := s.Run()
		if err != nil {
			log.Fatal(err)
		}
	}()

	root := "/" + strings.Trim(filepath.ToSlash(*rootFlag), "/")

	if root != "/" {
		mux := http.NewServeMux()
		mux.Handle(root, http.RedirectHandler(root+"/", http.StatusTemporaryRedirect))
		mux.Handle(root+"/", http.StripPrefix(root, handler))
		handler = mux
	}

	log.Printf("Listening on %s (%s)\n", addr, root)
	if err = http.ListenAndServe(addr, handler); err != nil {
		log.Fatal(err)
	}

}
