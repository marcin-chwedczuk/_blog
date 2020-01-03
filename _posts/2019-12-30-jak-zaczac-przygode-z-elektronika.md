---
author: mc
layout: post
cover: 'assets/images/mc_cover2.jpg'
title: Jak zacząć przygodę z elektroniką
date: 2019-12-30 00:00:01
tags: polish elektronika
subclass: 'post tag-test tag-content'
categories: mc
navigation: True
logo: 'assets/images/home.png'
disqus: true
---

Parę miesięcy temu postanowiłem powrócić do mojego
hobby z czasów dziecinstwa: elektroniki.
Powrót, po ponad dziesięciu latach przerwy, okazał
się być trudniejszy niż przypuszczałem,
a droga do pierwszego działającego układu 
pełna frustracji i porażek.

Pomimo tego radość z wykonania najprostrzego generatora,
który naprzemiennie mrugał diodami LED dostarczyła
mi tak dużo radości i frajdy, że przez następnych
kilka wieczorów oddałem się w całości budowie kolejnych układów.

Niestety elektronika jako hobby, nie jest
w polsce tak popularna jak 
miało to miejsce w końcówce lat dziewiędziesiątych.
A szkoda, bo na zachodzie mamy obecnie do czynienia
z prawdziwym renesansem elektroniki.
Dobrze ilustrują to platformy takie jak
[Arduino](https://www.arduino.cc/) czy
[Raspberry PI](https://www.raspberrypi.org/).
Nie wspominając już o modzie na retro-computing
(a więc na budowę prymitywnych komputerów wprost
z układów scalonych) uosabianym przez takie postaci
jak [Ben Eater](https://www.youtube.com/channel/UCS0N5baNlQWJCUrhCEo8WlA)
i projekty jak [The MOnSter 6502](https://monster6502.com/) i
[Gigatron](https://gigatron.io/)

Niestety nauka nowej umiejętności czy jest nią jazda samochodem,
czy może język obcy czy też elektronika, nie jest prosta.
Na początkujących czycha wiele pułapek, które zniechęcają ich 
do dalszej nauki. Dlatego, aby ułatwić początkującym wejście w
świat elektronik, postawiłem podzielić się moimi doświadczeniami
(czytaj wpadkami)
i opisać problemy na jakie się natkąłem.
To jest pierwszy wpis z tej serii, w którym opisuję
pułapik które czekają nas przy zakupie pierwszych płytek
stykowych, przewodów i elementów elektroniczych. Zapraszam!

#### Płytka stykowa

Według mnie najlepszym sposobem montażu układów, na początku
przygody z elektroniką są płytki stykowe.
Na rysunku poniżej przedstawiam przykład dwóch takich płytek:
![Przykładowe płytki stykowe](assets/images/2019-12-30/plytki-stykowe-1.jpg)

Płytka oznaczona numerem 1, to przykład płytki droższej
która pomimo tego posiada kilka poważnych mankamentów.
Po pierwsze brakuje oznaczenia polaryzacji szyn zasilania,
co rodzi pole do przykrych w konsekwencjach pomyłek
(np. nieprawidłowe doprowadzenie zasialania do układu scalonego).
Po drugie szyny zasialania są "przecięte" w połowie płytki
(patrz strzałki). Tego typu "przecięcie" przydaje 
się gdy budujemy układy w których występują dwa poziomy
zasilania np. 3.3V i 5V. Większość początkujących
elektroników korzysta jednak z pojedyńczego napięcia zasilania.
W praktyce okazało się to tak denerwujące że dodałem specjalne
oznaczenia markerem, żeby już więcej się nie zastanawiać dlaczego
połowa układu nie ma napięcia zasilania.

Płytka oznaczona numerem 2 to tania płytka (7 PLN za sztukę),
produkcji Chińskiej. Pomimo tego producent
nie oszczędzał na pomocnych oznaczeniach. 
Każda z czterech lini zasilania
ma swój kolor, każde gniazdo jest adresowane 
za pomocą kombinacji litery (a-j) i liczby (1-65).
Może, na pierwszy rzut oka nie wydaje się to
przydatne, ale w internecie można znaleść mnóstwo
projektów pomyślanych specjalnie do wykonania
na płytkach stykowych, które zawierają instrukcje
typu: "umiejść rezystkor 1k w gniazdach 5f i 5c".

Niestety niska cena płytki nr. 2 znalazła negatywne
odbicie w jakości styków. Korzystanie z tej płytki
rodziło sporo kłopotów: często miałem problemy żeby
włożyć końcówkę przewodu lub nóżkę elementu do danego
gniazda. Czasami pomagało wetknięcie szpilki, czasami
włożenie przewodów najpierw do sąsiadujących gniazd
a dopiero potem przeniesienie ich do tego własciwego.
Czasami pomagało "wiercenie" w gniezdzie nóżką diody LED.
Innymi słowy spora część radości z wykonania układu ustępywała
miejsca frustracji związanej z niskiej jakości płytką.

Przed zakupem płytek polecam przeczytać
recenzje, zarówno na polski forach jak i na zagranicznyc (oraz
na Amazonie). Osobiście nie znalazłem jak do tej pory
płytki stykowej godnej polecenia, jeżeli taką znacie to
proszę dodajcie komentarz z linkiem.

Wrócmy jeszcze na chwilę do zdjęcia płytek. 
Część oznaczona numerem cztery to pojedyńcza szyna zasilania
odseparowana od płytki stykowej typu dwa. 
Jak się okazuje od każdej płytki możem oderwać jedną lub
obie szyny zasilania. Przy wykonywaniu tej operacji
przydaje się nożyk do kartonu który pozwoli nam
rozciąć izolacyjny materiał znajdujący się na spodzie płytki.

Każda płytka stykowa posiada wypustki, które pozwalają
zbudować "megapłytkę" z dwóch lub większej liczby 
pojedyńczych płytek (z obecnymi lub oderwanymi szynami zasliania).
Niestety płytki wyprodukowane przez różne firmy rzadko
są ze sobą kompatybilne. 
Poniżej umiejszczam zdjęcie takiej "megapłytki":
![Megapłytka](assets/images/2019-12-30/megaplytka.jpg)

Oprócz pełonowymiarowych płytek na ryku dostępne są też
mniejszcze modele "mini":
![Mini płytki](assets/images/2019-12-30/mini.jpg)
Osobiście nie polecam ich początkującym, gdyż są
po prostu za małe.

Wydawało by się że orientacja płytki nie ma żadnego znaczenia.
Warto jednak przy budowie układów podążać za sprawdzoną regułą
która mówi że prądy powinny płynąć z góry na dół, a sygnały
od lewej do prawej. W praktyce oznacza to że górna wewnętrzna
szyna zasilająca powinna być podłączona do plusa zasilania,
a dolna wewnątrzna do minusa. Przestrzeganie tej
zasady znacznie ułatwi nam doprowadzanie zasilania do układów scalonych.

A skoro już jesteśmy przy układach scalonych, większość
z nich nie posiada prostopodałych nóżek. Zamiast tego
nóżki rozchodzą się nieco na boki, co uniemożliwia umiejszczenie
takiego układu w płytce stykowej. Rozwiązaniem tego
problemu jest przygięcie nóżek scalaka przed włożeniem go
do płytki:
![Ach te nóżki](assets/images/2019-12-30/nogi.jpg)

Zanim opuścimy temat płytek warto jeszcze dodać, że
na opakowaniu płytki znajduje się jeden z najważnejszych
jej parametrów, mianowicie zakres grubości drutów/końcówek
z jakimi płytka współpracuje. Ten parametr okaże się istotny
gdy będziemy planować zakup przewodów kompatybilnych
z płytką (czytaj nie każdy przewód pasuje do danej płytki).

#### Przewody / połączenia / zworki

Oprócz płytki stykowej, przy budowie układów będziemy
też potrzebowali całej masy przewodów.
Osobiście polecam zakup zestawu przewodów
takich jak [Adafruit Hook-up Wire](https://www.adafruit.com/product/3174),
wraz ze szczypcami do ściągania izolacji takimi
jak [Adafruit wire stripper](https://www.adafruit.com/product/147):
![Przewody](assets/images/2019-12-30/druty.jpg)
Przy zakupie warto zwracać uwagę czy napewno kupujemy
_jednożyłowy_, _cynowany_ przewód miedziany a nie na przykład
wielożyłowy (czysta miedź pokrywa się
nieprzewodzącą warstwą tlenków, cynowany drut zapewni
nam znacznie lepszą jakość połączeń).

Przedstawiony powyżej zestaw przewodów, ma grubość
drutu AWG 22 (miara amerykańska), co przelicza się
na polskie 0.6438 milimetra średnicy.
Płytki stykowe z pierwszej sekcji, pracują poprawnie z przewodami
o grubościach 0.3-0.8 milimetra, a więc są kompatybilne z tym
zestawem przewodów.

Ze względu na rosnące ceny miedzi zakup zestawów, takich
jak te przedstawione powyżej, może wiązać się ze sporym wydatkiem.
Należy jednak pamiętać że
jeden zestaw przewodów powinien zaspokoić nasze potrzeby na mniej więcej rok,
a szczypce to wydatek jednorazowy.
Obecna cena powyższego zestawu przewodów w sklepie [Mouser](https://pl.mouser.com/)
wynosi około 120PLN. Oczywiście zawsze warto sprawdzić czy
nie znajdziemy lepszej oferty w polskich sklepach, na ceneo czy
w końcu na AliExpressie.

Oprócz zestawu przewodów, w sklepach można znaleść również zestawy zworek
(numer jeden na zdjęciu):
![Przewody ciąg dalszy](assets/images/2019-12-30/zwory.jpg)
Zestawy takie są, w stosunku do ich ceny, kompletnie bezużyteczne.
Zwory prawie nigdy nie miały potrzebnej długości gdy chciałem
ich użyć. Krótkie zworki kończyły się bardzo szybko, podczas
gdy długich zostawał nadmiar. Jedynm słowem: nie polecam.

Polecam za to zakup elastycznych przewodów połączeniowych
(numer dwa i trzy na zdjęciu).
Przewody typu trzy dostępne są w zestawach o dosyć przystępnej
cenie. Przewody typu dwa występują we wstęgach, które można
rozrywać (nawet na pojedyńcze przewody) wedle upodobań.

Do zabawy z płytkami stykowymi i Arduino potrzebne nam będą przede
wszystkim przewody z wtykami męskimi (patrz numer trzy).
Do zabawy z Rasbperry PI,
a także z modułami do Arduino (np. czujniki ruchu) przydadzą się
przewody męsko-żeńskie (patrz numer dwa).

Czasami zdarza sie, że przewody przychodzące w zestawach mają
końcówki wtyków pokryte ochronną warstwą plastiku którą łatwo
przeoczyć. Jeżeli przedów "źle łączy" należy sprawdzić czy
końcówki nie posiadają takiej ochronnej izolacji i ewentualnie
ją usunąć.

Warto zarezerwować sobie dwa kolory (np. czarny i czerwony)
na oznaczenie przewodów które mają potencjał masy i plusa zasialania.
Warto też pomysleć o konwencji użycia kolorów na przykład: przewód biały to
zawsze sygnał zegara.
Poza tym im więcej kolorów mamy do dyspozycji tym lepiej.

#### Pozostałe narzędzia

Pozostałe przydatne narzędzia to:

1. Mały płaski śrubokręt
2. _Szczypce tnące boczne_
 do ucinania zbyt długich wyprowadzeń elementów
 ([model ze zdjęcia](https://botland.com.pl/pl/szczypce/5851-szczypce-tnace-boczne-yato-yt-2081-115mm-5906083920813.html))
3. Oraz najbardziej przydatna z całej tej
 trójki, bo pozwalająca wygodnie wyjmować i wkładać przewody
 połączeniowe - penseta
 ([model ze zdjęcia](https://sklep.avt.pl/peseta-antystatyczna-122mm-prosta-ostra-esd-10.html))

![Przydatne narzędzia](assets/images/2019-12-30/szczypce.jpg)

Przycinanie wyprowadzeń elementów za pomocą przedstawionych
powyżej szczypiec jest odrobinę niebezpieczne.
Nóżki, na przykład dużych diod LED, podczas przycinania mają tendencje to
"wystrzeliwania" w znanym tylko sobie kierunku, dlatego
warto też pomyśleć o zakupie 
[okularów ochronnych](https://botland.com.pl/en/goggles/5626-okulary-yt-7367-5906083973611.html).

Ostatnim, naprawdę niezbędnym narzędziem, w jakie
powinniśmy się zaopatrzeć jest multimetr.
Ja używam następującego modelu, mało znanej chińskiej
marki i jestem z niego całkowicie zadowolony:
![Multimetr](assets/images/2019-12-30/multi.jpg)

#### Elementy elektroniczne

* Rezystory - za ciękie nużki / Welleman kit
* Uwaga: Elementy przystosowane do płytek stykowych
  vs PCB (płytki drukowane) na przykładzie przycisków.
* Zginanie nużek w układach scalaonych (IC)
* Szfeczka na elementy elektroniczne

#### Zasilanie

* Bateria 9V + konektor + konwerter (ssie)
* Zasilacz "pokładowy"
    - nie piszczy jak jest zwarcie !

#### Sklepy

* AVT, Borland, Forbot
* Mouser

#### Nauka

* Sztuka elektroniki, podręcznik dla studentów!
* Ben Eaters
* EEVBlog
* All about circuits
* Elektronika dla wszystkich





