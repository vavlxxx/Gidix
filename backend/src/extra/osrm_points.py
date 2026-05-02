from dataclasses import dataclass


@dataclass(frozen=True)
class Point:
    name: str
    lon: float
    lat: float


points = [
    Point(
        "Башкирский государственный театр оперы и балета", 55.944494, 54.722589
    ),  # osm:amenity=theatre
    Point(
        "Башкирский академический театр драмы имени Мажита Гафури", 55.940705, 54.718793
    ),  # osm:amenity=theatre
    Point("Памятник Салавату Юлаеву", 55.925845, 54.718477),  # osm:tourism=attraction
    Point("А. Матросову", 55.943976, 54.719988),  # osm:historic=memorial
    Point("Спутник", 55.820806, 54.694997),  # osm:amenity=arts_centre
    Point("Загиру Исмагилову", 55.945441, 54.723087),  # osm:historic=memorial
    Point("МиГ-19", 55.941829, 54.724700),  # osm:historic=aircraft
    Point(
        "Героям Октябрьской революции и гражданской войны", 55.974692, 54.737036
    ),  # osm:historic=memorial
    Point("В. И. Ленин", 56.024046, 54.772890),  # osm:historic=memorial
    Point(
        "Мемориал павшим в Гражданской войне", 55.950777, 54.739654
    ),  # osm:historic=memorial
    Point("Северный фонтан", 55.944581, 54.718479),  # osm:amenity=fountain
    Point("Южный фонтан", 55.944121, 54.717507),  # osm:amenity=fountain
    Point(
        "Суверенитету Республики Башкортостан", 55.943989, 54.718860
    ),  # osm:historic=memorial
    Point("Подвесной мост", 55.954187, 54.712002),  # osm:tourism=viewpoint
    Point("Феликсу Дзержинскому", 55.950236, 54.727967),  # osm:historic=memorial
    Point("Паровоз", 55.826278, 54.712827),  # osm:historic=memorial
    Point("Бык", 56.093759, 54.798463),  # osm:historic=memorial
    Point("мечеть Аль-Агла", 55.805211, 54.809480),  # osm:amenity=place_of_worship
    Point("Ихлас", 55.974321, 54.705520),  # osm:amenity=place_of_worship
    Point("СУ-27", 56.138570, 54.792193),  # osm:historic=aircraft
    Point("М. Гафури", 55.940953, 54.719273),  # osm:historic=memorial
    Point("Памятник материнству", 55.832127, 54.700268),  # osm:historic=memorial
    Point("С. Юлаеву", 55.946616, 54.718364),  # osm:historic=memorial
    Point("Маяковскому", 55.951436, 54.724987),  # osm:historic=memorial
    Point("Ш. Худайбердину", 55.966131, 54.736637),  # osm:historic=memorial
    Point("Жертвам репрессий", 55.974889, 54.738798),  # osm:historic=memorial
    Point("В. И. Ленину", 55.833645, 54.699577),  # osm:historic=memorial
    Point(
        "Памятник 112 Башкирской кавалерийской дивизии", 55.840205, 54.703538
    ),  # osm:historic=memorial
    Point("Памятник И.И. Рыбалко", 55.840298, 54.703702),  # osm:historic=memorial
    Point("Могила Рашита Нигмати", 55.951417, 54.712537),  # osm:historic=memorial
    Point(
        "Стела в память об усадьбе семьи Аксаковых", 55.952017, 54.719972
    ),  # osm:historic=memorial
    Point("М. Горькому", 55.949281, 54.721049),  # osm:historic=memorial
    Point("Г. К. Жукову", 56.057623, 54.768495),  # osm:historic=memorial
    Point(
        "Детская школа искусств № 3", 55.833341, 54.706070
    ),  # osm:amenity=arts_centre
    Point(
        'Центр детского творчества "Умелец"', 56.128555, 54.783584
    ),  # osm:amenity=arts_centre
    Point("Памятник В.И. Ленину", 56.089185, 54.814166),  # osm:historic=memorial
    Point(
        "Мемориал Ш. Худайбердину, А. Ермолаеву, М. Гафури", 55.942857, 54.717882
    ),  # osm:historic=memorial
    Point(
        "Орден Дружбы Народов (1972 г.)", 55.943646, 54.718871
    ),  # osm:historic=memorial
    Point("Орден Ленина (1935 г.)", 55.943398, 54.718361),  # osm:historic=memorial
    Point("Орден Ленина (1957 г.)", 55.943446, 54.718455),  # osm:historic=memorial
    Point(
        "Орден Октябрьской Революции (1969 г.)", 55.943614, 54.718795
    ),  # osm:historic=memorial
    Point(
        "Памятник героям Гражданской войны", 55.942989, 54.717858
    ),  # osm:historic=memorial
    Point("Памятник Серго Орджоникидзе", 56.069129, 54.819254),  # osm:historic=memorial
    Point(
        "Пожарным, погибшим при исполнении служебного долга", 55.951455, 54.722335
    ),  # osm:historic=memorial
    Point(
        "Памятник А.Матросову и М.Губайдуллину", 56.055192, 54.823191
    ),  # osm:historic=memorial
    Point("Скорбящая мать", 56.056713, 54.817622),  # osm:historic=memorial
    Point("Танк Т-34", 56.057841, 54.823580),  # osm:historic=memorial
    Point("Нулевой километр", 55.947716, 54.726205),  # osm:historic=memorial
    Point("М. Акмулле", 55.948610, 54.723712),  # osm:historic=memorial
    Point("За-фа-за ихсан", 55.936857, 54.701828),  # osm:amenity=place_of_worship
    Point("Стелла 60-ю победы в ВОВ", 55.975997, 54.738608),  # osm:historic=memorial
    Point("Дворник", 55.987043, 54.741242),  # osm:tourism=artwork
    Point(
        "Государственный концертный зал «Башкортостан»", 55.950821, 54.730067
    ),  # osm:amenity=theatre
    Point(
        "Обыденный храм в честь блаженной Матроны Московской", 56.064446, 54.764735
    ),  # osm:amenity=place_of_worship
    Point("Дом-музей Ш. Худайбердина", 55.955681, 54.719378),  # osm:tourism=museum
    Point("Покровский храм", 55.808181, 54.809002),  # osm:amenity=place_of_worship
    Point("Памятник Ленину", 56.009885, 54.752433),  # osm:historic=memorial
    Point("БТР", 55.876649, 54.790080),  # osm:historic=memorial
    Point("Музей этнологии и географии", 55.939115, 54.721054),  # osm:tourism=museum
    Point(
        "Медресе им. Марьям Султановой", 55.943960, 54.727489
    ),  # osm:amenity=place_of_worship
    Point("Фаляк", 56.094705, 54.814337),  # osm:amenity=place_of_worship
    Point("Погибшим бойцам СОБР", 56.094544, 54.819574),  # osm:historic=memorial
    Point("X-Max", 56.024802, 54.770232),  # osm:tourism=gallery
    Point(
        "Музей истории развития образования", 55.937312, 54.723953
    ),  # osm:tourism=museum
    Point(
        "Музей современного искусства РБ им. Н. Латфуллина", 55.944917, 54.732811
    ),  # osm:tourism=museum
    Point("Уфа Арт", 56.019352, 54.763880),  # osm:tourism=gallery
    Point(
        "Уфимская художественная галерея", 55.957179, 54.734402
    ),  # osm:tourism=gallery
    Point("выставочный зал Ижад", 56.068614, 54.818642),  # osm:tourism=gallery
    Point(
        "выставочный зал Наука и Искусство", 55.951363, 54.731290
    ),  # osm:tourism=gallery
    Point("Галерея «Мирас»", 55.951652, 54.734223),  # osm:tourism=gallery
    Point(
        "Малый выставочный зал Союза художников РБ", 55.950918, 54.733959
    ),  # osm:tourism=gallery
    Point("Якутов И.С.", 55.951661, 54.739230),  # osm:historic=memorial
    Point(
        "Участникам гражданской войны", 55.978917, 54.739468
    ),  # osm:historic=memorial
    Point("Полумесяц", 55.973904, 54.705707),  # osm:historic=memorial
    Point("Змей Горыныч", 55.829571, 54.703609),  # osm:historic=memorial
    Point("Серебряный  велосипедист", 55.831924, 54.706719),  # osm:historic=memorial
    Point('Скала "Голова"', 56.010546, 54.781121),  # osm:tourism=viewpoint
    Point("А.Д. Цюрупе", 55.951082, 54.723380),  # osm:historic=memorial
    Point("Весенняя песня", 56.020153, 54.766677),  # osm:historic=memorial
    Point("Калинин", 56.040245, 54.796877),  # osm:historic=memorial
    Point("Мудрая сова", 56.025434, 54.745567),  # osm:historic=memorial
    Point("Землемер", 56.008601, 54.750843),  # osm:historic=memorial
    Point("Мирному времени", 55.997962, 54.719602),  # osm:historic=memorial
    Point("Домик куницы", 55.954030, 54.739168),  # osm:tourism=artwork
    Point('"Трибуна"', 55.959292, 54.738465),  # osm:historic=memorial
    Point(
        "в честь 50-летия Октябрьской революции", 55.951447, 54.735631
    ),  # osm:historic=memorial
    Point("Мустаю Кариму", 55.946130, 54.731660),  # osm:historic=memorial
    Point(
        "Фрагмент картины Нестерова на стене", 55.944938, 54.729359
    ),  # osm:tourism=artwork
    Point("Три шурупа", 55.945431, 54.720629),  # osm:historic=memorial
    Point("Пушкин А.С.", 55.940356, 54.723032),  # osm:historic=memorial
    Point("Аксаков С.Т.", 55.943221, 54.722610),  # osm:historic=memorial
    Point(
        "Друзьям человека, служившим медицинской науке", 55.967173, 54.713367
    ),  # osm:historic=memorial
    Point("М. Гареев", 56.029953, 54.790936),  # osm:historic=memorial
    Point("Железный конь", 56.026358, 54.742351),  # osm:tourism=attraction
    Point("Трактор СХТ3-15/30", 56.026664, 54.740880),  # osm:historic=memorial
    Point(
        'Группа скульптур в стиле "гипсовый реализм"', 56.027155, 54.742891
    ),  # osm:historic=memorial
    Point('Скала "Висячий камень"', 56.020592, 54.790488),  # osm:tourism=viewpoint
    Point(
        "Памятный камень ликвидаторам радиационных катастроф", 56.088790, 54.815617
    ),  # osm:historic=memorial
    Point("Машина времени", 56.138563, 54.791505),  # osm:historic=memorial
    Point("Н. Ф. Гастелло", 56.140179, 54.796775),  # osm:historic=memorial
    Point(
        "Солдату Великой Отечественной Войны", 56.092813, 54.812895
    ),  # osm:historic=memorial
    Point("Открытая книга", 55.927248, 54.722754),  # osm:historic=memorial
    Point("Пчела", 55.927506, 54.723628),  # osm:historic=memorial
    Point("Шаляпину Ф.И.", 55.945913, 54.722358),  # osm:historic=memorial
    Point("Рудольфу Нуриеву", 55.945118, 54.722214),  # osm:historic=memorial
    Point("БГУ", 55.931876, 54.720917),  # osm:historic=memorial
    Point("Самолет у РВК", 56.079052, 54.824380),  # osm:historic=memorial
    Point("розовый бегемот", 56.036204, 54.777493),  # osm:historic=memorial
    Point("Музей И. В. Сталина", 56.031754, 54.786096),  # osm:tourism=museum
    Point("Музей противопожарной службы", 55.952432, 54.722824),  # osm:tourism=museum
    Point("Памятник геодезистам", 55.952685, 54.732801),  # osm:tourism=artwork
    Point("Журавли", 56.121346, 54.787799),  # osm:tourism=artwork
    Point("Ю.А. Гагарин", 55.943829, 54.726082),  # osm:historic=memorial
    Point("the ТЕАТР", 55.943764, 54.724909),  # osm:amenity=theatre
    Point("улица им. Р.Зорге", 55.996599, 54.758212),  # osm:historic=memorial
    Point("дом Паршина", 55.936607, 54.726115),  # osm:memorial=plaque
    Point("Довлатов", 55.939000, 54.728031),  # osm:historic=memorial
    Point(
        "Здание общественное кон. XIX", 55.939122, 54.728283
    ),  # osm:historic=memorial
    Point("телеграф Сахарова", 55.938582, 54.730324),  # osm:historic=memorial
    Point("Казармы внутренней стражи", 55.942411, 54.732337),  # osm:historic=memorial
    Point("Валеев", 55.944651, 54.733032),  # osm:historic=memorial
    Point("Имашев", 55.944656, 54.733043),  # osm:historic=memorial
    Point("Королёва", 55.944661, 54.733053),  # osm:historic=memorial
    Point("Куница", 56.023286, 54.769599),  # osm:tourism=artwork
    Point("Городской дворец культуры", 56.037039, 54.796175),  # osm:amenity=theatre
    Point("Подводная лодка", 56.055094, 54.825830),  # osm:historic=monument
    Point("Медведь", 56.020214, 54.771695),  # osm:tourism=artwork
    Point("А.С. Максимову", 55.932160, 54.721784),  # osm:historic=memorial
    Point("А.Ф. Лутфуллину", 55.932353, 54.721964),  # osm:historic=memorial
    Point("А.Ф. Полаку", 55.932045, 54.721854),  # osm:historic=memorial
    Point("Р.Г. Кузееву", 55.931929, 54.721873),  # osm:historic=memorial
    Point("И.И. Дильмухаметову", 55.931889, 54.721879),  # osm:historic=memorial
    Point("Мавлютов Р.Р.", 55.930096, 54.722778),  # osm:historic=memorial
    Point("Гайнуллин М.Ф.", 55.930118, 54.722824),  # osm:historic=memorial
    Point("Кудояров Г.Х.", 55.930236, 54.723072),  # osm:historic=memorial
    Point("Ахметзянов", 55.928530, 54.724040),  # osm:historic=memorial
    Point("Зенцов", 55.931584, 54.726974),  # osm:historic=memorial
    Point("конференция РСДРП", 55.932017, 54.728857),  # osm:historic=memorial
    Point("ЭвакоГоспиталь №3120", 55.932243, 54.728821),  # osm:historic=memorial
    Point("2я женская гимназия", 55.932499, 54.728832),  # osm:historic=memorial
    Point("Сафин", 55.927771, 54.727164),  # osm:historic=memorial
    Point("Нуреев", 55.926171, 54.727175),  # osm:historic=memorial
    Point("Муса Гайсинович Гареев", 56.054460, 54.824543),  # osm:historic=tomb
    Point(
        "Башкирская государственная филармония имени Хусаина Ахметова",
        55.939676,
        54.728294,
    ),  # osm:amenity=arts_centre
    Point("Большой зал", 55.939867, 54.728344),  # osm:amenity=theatre
    Point("Малый зал", 55.939822, 54.728186),  # osm:amenity=theatre
    Point(
        "Памятник хоккейным болельщикам", 55.955253, 54.739829
    ),  # osm:tourism=attraction
    Point("Медведица и медвежата", 56.138681, 54.788308),  # osm:tourism=artwork
    Point("Памятник К.И. Абрамовой", 56.023044, 54.748718),  # osm:historic=memorial
    Point("Вечный огонь", 56.055406, 54.823141),  # osm:historic=memorial
    Point("Лисица и журавль", 56.006826, 54.726685),  # osm:tourism=artwork
    Point("Крайняя точка Европы", 55.951162, 54.741023),  # osm:tourism=artwork
    Point(
        "Учебный театр имени Габдуллы Гилязева", 55.949743, 54.720134
    ),  # osm:amenity=theatre
    Point(
        "Башкирский государственный театр кукол", 56.035520, 54.785899
    ),  # osm:amenity=theatre
    Point("Планета", 56.033464, 54.755175),  # osm:tourism=artwork
    Point("Маёвка 1905 года", 56.022167, 54.713232),  # osm:historic=memorial
    Point("Клещ Валера II", 55.947962, 54.733350),  # osm:tourism=artwork
    Point(
        "Аллея героев Советского Союза- уроженцев Уфимского района",
        55.892280,
        54.803855,
    ),  # osm:tourism=artwork
    Point("Уфа", 55.854490, 54.804340),  # osm:tourism=artwork
    Point("Генерал-майор М. Шаймуратов", 55.855291, 54.791628),  # osm:historic=memorial
    Point("Самолёт Ан-24Б", 55.853534, 54.794479),  # osm:historic=memorial
    Point("Вертолет Ми-24А", 55.853411, 54.793771),  # osm:historic=memorial
    Point("БРДМ-2(ГАЗ-41)", 55.853400, 54.793672),  # osm:historic=memorial
    Point("Роснефть", 55.804310, 54.675173),  # osm:tourism=artwork
    Point("Лень В Пень", 56.027379, 54.772194),  # osm:tourism=attraction
    Point(
        'Тропа Здоровья "Уфимские липы"', 55.986720, 54.758247
    ),  # osm:tourism=attraction
    Point("Орёл", 56.125640, 54.780592),  # osm:historic=memorial
    Point("СУ-25", 56.138661, 54.792479),  # osm:historic=aircraft
    Point("Ф. А. Гаскаров", 55.944523, 54.733976),  # osm:historic=memorial
    Point("Г. М. Тукаеву", 55.944494, 54.733915),  # osm:historic=memorial
    Point("С. Агиш", 55.944467, 54.733857),  # osm:historic=memorial
    Point("М. Л. Кондратьв", 55.944451, 54.733823),  # osm:historic=memorial
    Point("Эвакгоспиталь #1742", 55.941513, 54.727563),  # osm:historic=memorial
    Point("Константин Пятс", 55.940432, 54.727354),  # osm:historic=memorial
    Point("Х. Х. Абдрахманов", 55.957479, 54.732291),  # osm:historic=memorial
    Point("Уфимский городовой", 55.947982, 54.727930),  # osm:historic=memorial
    Point("гостиница Метрополь", 55.946554, 54.721492),  # osm:tourism=attraction
    Point("Я рисую", 56.058447, 54.771388),  # osm:amenity=arts_centre
    Point("Газовикам Башкортостана", 56.007650, 54.766583),  # osm:historic=memorial
    Point('Указатель "Районы Уфы"', 56.006695, 54.771880),  # osm:tourism=artwork
    Point("Мальчик с кураем", 55.946369, 54.728008),  # osm:tourism=artwork
    Point("Музей истории города Уфы", 55.951341, 54.733613),  # osm:tourism=museum
    Point("Wow park", 55.984617, 54.716701),  # osm:leisure=trampoline_park
    Point("Габдулла Тукай", 55.939981, 54.725353),  # osm:historic=memorial
    Point("Якорь", 55.937321, 54.725633),  # osm:historic=memorial
    Point("Поцелуй", 55.945535, 54.727634),  # osm:tourism=artwork
    Point("Микеланджело", 55.946920, 54.727999),  # osm:amenity=arts_centre
    Point("ArtTerria", 55.944833, 54.720669),  # osm:tourism=attraction
    Point("Зое Космодемьянской", 55.922612, 54.727407),  # osm:historic=memorial
    Point("Уфа Город герой труда", 55.958854, 54.712344),  # osm:historic=memorial
    Point("UFA", 55.950409, 54.703587),  # osm:tourism=artwork
    Point("Грузовик", 55.975717, 54.751975),  # osm:historic=memorial
    Point("Памятник пограничникам", 56.054896, 54.822569),  # osm:historic=memorial
    Point("Памятник ВДВ", 56.056358, 54.822361),  # osm:historic=memorial
    Point("Габдулла Байбурин", 55.953065, 54.715225),  # osm:historic=memorial
    Point("Монумент дружбы", 55.963500, 54.711800),  # osm:historic=monument
    Point("Инфинити 2150", 55.944301, 54.719502),  # osm:tourism=artwork
    Point("Мера времени", 55.944356, 54.719636),  # osm:tourism=artwork
    Point("Утро", 55.944452, 54.719869),  # osm:tourism=artwork
    Point("Белая река", 55.944541, 54.720074),  # osm:tourism=artwork
    Point("Галактика", 55.944629, 54.720265),  # osm:tourism=artwork
    Point("Анаклия", 55.944842, 54.720744),  # osm:tourism=artwork
    Point("Аполлон", 55.944942, 54.720936),  # osm:tourism=artwork
    Point("Мать и дитя", 55.945022, 54.721106),  # osm:tourism=artwork
    Point("Похищение Европы", 55.944750, 54.720549),  # osm:tourism=artwork
    Point("Евразия", 55.945106, 54.721291),  # osm:tourism=artwork
    Point("В будущее Мисаки", 55.945186, 54.721471),  # osm:tourism=artwork
    Point("Капсула времени", 55.950457, 54.719990),  # osm:tourism=artwork
    Point("Ул. имени Б. Шафиева", 56.003387, 54.763555),  # osm:historic=memorial
    Point("Академия ГШ РККА", 55.937052, 54.723951),  # osm:historic=memorial
    Point("Х. Г. Яруллин", 55.930608, 54.723811),  # osm:historic=memorial
    Point("Г. Ибрагимов", 55.932616, 54.723476),  # osm:historic=memorial
    Point("А.Х. Габдрахманов", 55.930576, 54.723750),  # osm:historic=memorial
    Point("Р. Султангареев", 55.930592, 54.723780),  # osm:historic=memorial
    Point("Девушка с горностаем", 56.007158, 54.700409),  # osm:tourism=artwork
    Point("Кураист", 56.012514, 54.699977),  # osm:tourism=artwork
    Point("Zaman", 55.945659, 54.727565),  # osm:tourism=gallery
    Point("План города Уфы", 55.947913, 54.727787),  # osm:tourism=artwork
    Point("Стена моряка", 55.945831, 54.727788),  # osm:tourism=artwork
    Point("Байбаков", 55.936050, 54.723574),  # osm:historic=memorial
    Point("МиГ-29УБ", 56.138526, 54.793107),  # osm:historic=aircraft
    Point("К.П. Кузнецов", 55.948949, 54.729853),  # osm:historic=memorial
    Point("М.Г. Салигаскарова", 55.948964, 54.729882),  # osm:historic=memorial
    Point("Назаров М.С.", 55.951277, 54.735002),  # osm:historic=memorial
    Point("Минфин И.Ф.", 55.951284, 54.735023),  # osm:historic=memorial
    Point("Мавлютова М.З.", 55.952712, 54.735848),  # osm:historic=memorial
    Point("Вагапов С.А.", 55.952725, 54.735873),  # osm:historic=memorial
    Point("Миролюбов С.Н.", 55.952962, 54.736369),  # osm:historic=memorial
    Point("Чанбарисов Ш.Х.", 55.953483, 54.735709),  # osm:historic=memorial
    Point("Юноша, играющий на дудочке", 55.953359, 54.739311),  # osm:tourism=artwork
    Point("Двушка с ребенком", 55.952944, 54.739352),  # osm:tourism=artwork
    Point("Девочка и олененок", 55.952558, 54.739420),  # osm:tourism=artwork
    Point("Влюбленная пара", 55.952487, 54.739335),  # osm:tourism=artwork
    Point("Семья", 55.952890, 54.739271),  # osm:tourism=artwork
    Point("Девочка с книгой", 55.953342, 54.739190),  # osm:tourism=artwork
    Point("Дети на качелях", 55.951354, 54.739449),  # osm:tourism=artwork
    Point("Мальчик с собакой", 55.951619, 54.739560),  # osm:tourism=artwork
    Point("Семья аистов", 55.950080, 54.739823),  # osm:tourism=artwork
    Point("Старушка", 55.949791, 54.739863),  # osm:tourism=artwork
    Point("Семья медведей", 55.949438, 54.739908),  # osm:tourism=artwork
    Point("Мама с ребенком", 55.949402, 54.739841),  # osm:tourism=artwork
    Point("Дедушка и шахматы", 55.949772, 54.739788),  # osm:tourism=artwork
    Point("Танцующие девочки", 55.949002, 54.739989),  # osm:tourism=artwork
    Point("Мальчик с самолетом", 55.948971, 54.739911),  # osm:tourism=artwork
    Point("Изображение Салавата Юлаева", 55.943611, 54.732826),  # osm:tourism=artwork
    Point("Серафимов Максим Владимирович", 55.998440, 54.765526),  # osm:tourism=artwork
    Point("For friends", 55.951618, 54.727703),  # osm:tourism=artwork
    Point("Фонарщик", 55.992941, 54.755345),  # osm:tourism=artwork
    Point("Вагоновожатый", 55.995038, 54.757010),  # osm:tourism=artwork
    Point("Киномеханик", 55.995712, 54.757476),  # osm:tourism=artwork
    Point("Арка искусств", 55.946552, 54.723493),  # osm:tourism=artwork
    Point("Глухарь", 55.952171, 54.718595),  # osm:tourism=artwork
    Point("Кулик", 55.952479, 54.719176),  # osm:tourism=artwork
    Point("Семья Аксаковых", 55.953547, 54.718771),  # osm:tourism=artwork
    Point("Журавль", 55.953739, 54.718438),  # osm:tourism=artwork
    Point("Аленький цветочек", 55.953182, 54.719212),  # osm:tourism=artwork
    Point("Футбольный мяч", 56.064383, 54.825201),  # osm:tourism=artwork
    Point("Звезда", 55.995667, 54.697094),  # osm:tourism=artwork
    Point("Сквер Юнармейцев", 55.995756, 54.697076),  # osm:tourism=artwork
    Point(
        "Героям Великой Отечественной войны", 55.995936, 54.697243
    ),  # osm:historic=memorial
    Point("76 лет Победы", 55.997680, 54.698333),  # osm:historic=memorial
    Point("Камень желаний", 56.061637, 54.773649),  # osm:tourism=artwork
    Point("В.И. Ленину", 55.953360, 54.732788),  # osm:historic=memorial
    Point(
        "Национальный литературный музей", 55.976668, 54.728892
    ),  # osm:tourism=museum
    Point("Арка Довлатова", 55.938928, 54.727784),  # osm:tourism=artwork
    Point("Советский подъезд", 55.939828, 54.727589),  # osm:tourism=artwork
    Point("Телефонная будка", 55.939680, 54.727667),  # osm:tourism=artwork
    Point("Стена Довлатова", 55.939909, 54.727755),  # osm:tourism=artwork
    Point("Симфоническая сыроежка", 56.012799, 54.762384),  # osm:tourism=artwork
    Point("Кровеносная лисичка", 56.013466, 54.762948),  # osm:tourism=artwork
    Point("Росток", 55.835313, 54.714637),  # osm:amenity=arts_centre
    Point("Нефтяная волнушка", 56.015312, 54.764379),  # osm:tourism=artwork
    Point("Орнаментальная вешенка", 56.021584, 54.769359),  # osm:tourism=artwork
    Point("Брутовик", 56.017500, 54.766125),  # osm:tourism=artwork
    Point("Эчпочмята", 56.011820, 54.761664),  # osm:tourism=artwork
    Point("парк им. Калинина", 56.047775, 54.802016),  # osm:leisure=park
    Point("Тёплый берег", 56.111430, 54.779515),  # osm:leisure=park
    Point("Сквер Ленина", 55.946392, 54.725759),  # osm:leisure=park
    Point("Сквер Ильича", 56.089444, 54.814561),  # osm:leisure=park
    Point("Парк нефтехимиков", 56.092133, 54.817246),  # osm:leisure=park
    Point("Русский драматический театр", 56.022796, 54.771515),  # osm:amenity=theatre
    Point("Уфимский государственный цирк", 56.017452, 54.767799),  # osm:amenity=theatre
    Point("Парк Гафури", 56.019346, 54.772461),  # osm:leisure=park
    Point("Непейцевский дендропарк", 56.050609, 54.789667),  # osm:leisure=park
    Point("Дворец Молодёжи", 55.980709, 54.739383),  # osm:amenity=theatre
    Point(
        "Экзотариум уфимского музея естественной истории", 55.967151, 54.735529
    ),  # osm:tourism=museum
    Point("Сквер 50 летия победы", 55.974151, 54.737130),  # osm:leisure=park
    Point(
        "Национальный молодежный театр Республики Башкортостан имени Мустая Карима",
        55.951446,
        54.732259,
    ),  # osm:amenity=theatre
    Point(
        "Церковь Иисуса Христа святых последних дней", 56.035117, 54.768244
    ),  # osm:tourism=attraction
    Point(
        "Храм Равноапостольных Кирилла и Мефодия", 56.025877, 54.764178
    ),  # osm:amenity=place_of_worship
    Point("Дом-музей В. И. Ленина", 55.953278, 54.732864),  # osm:tourism=museum
    Point("Сквер геодезистов", 55.953090, 54.732738),  # osm:leisure=park
    Point(
        "Здание Коммерческого училища", 55.951291, 54.736842
    ),  # osm:historic=building
    Point(
        "Церковь Симеона Верхотурского", 55.956505, 54.745632
    ),  # osm:amenity=place_of_worship
    Point("Кашкадан", 56.061234, 54.773728),  # osm:leisure=park
    Point(
        "Никольский (вокзальный) храм", 55.946023, 54.746613
    ),  # osm:amenity=place_of_worship
    Point(
        "Уфимский государственный татарский театр «Нур»", 56.019622, 54.748510
    ),  # osm:amenity=theatre
    Point("Парк им В.И. Ленина", 55.943212, 54.718111),  # osm:leisure=park
    Point("Парк им С.Т. Аксакова", 55.952725, 54.719082),  # osm:leisure=park
    Point("Сквер им. Жукова", 56.057598, 54.768491),  # osm:leisure=park
    Point(
        "Хакимовская (четвёртая соборная) мечеть", 55.944614, 54.728339
    ),  # osm:amenity=place_of_worship
    Point(
        "Музей полярников им. В. И. Альбанова", 55.936927, 54.725749
    ),  # osm:tourism=museum
    Point(
        "Башкирский государственный художественный музей имени М. В. Нестерова",
        55.936183,
        54.724412,
    ),  # osm:tourism=museum
    Point(
        "Собор Рождества Пресвятой Богородицы", 55.973630, 54.727256
    ),  # osm:historic=church
    Point("сквер им. Маяковского", 55.951322, 54.724953),  # osm:leisure=park
    Point(
        "Здание губернской земской управы", 55.951345, 54.718507
    ),  # osm:historic=building
    Point("Дом Боровского", 55.948099, 54.728840),  # osm:historic=house
    Point("Национальный музей РБ", 55.946999, 54.720146),  # osm:tourism=museum
    Point("Дом губернатора", 55.945475, 54.716956),  # osm:historic=heritage
    Point("дом-музей Мажита Гафури", 55.936540, 54.722756),  # osm:tourism=museum
    Point("Дом-музей С.Т. Аксакова", 55.951617, 54.713563),  # osm:tourism=museum
    Point(
        "Первая Уфимская соборная мечеть", 55.949484, 54.714724
    ),  # osm:amenity=place_of_worship
    Point("Йэшлек House", 55.938938, 54.722669),  # osm:historic=house
    Point(
        "Южно-Уральский ботанический сад-институт", 56.013052, 54.727277
    ),  # osm:leisure=garden
    Point("Парк Первомайский", 56.117745, 54.806244),  # osm:leisure=park
    Point(
        "Храм Святых равноапосторальных Кирилла и Мефодия", 56.024200, 54.765033
    ),  # osm:amenity=place_of_worship
    Point("Спасский храм", 55.957911, 54.720510),  # osm:amenity=place_of_worship
    Point(
        "Свято-Сергиевский кафедральный собор", 55.967735, 54.710934
    ),  # osm:amenity=place_of_worship
    Point("сквер Волна", 55.877005, 54.789308),  # osm:leisure=park
    Point(
        "Богородско-Уфимский храм", 56.131957, 54.782406
    ),  # osm:amenity=place_of_worship
    Point("мечеть Ихлас", 55.974266, 54.705509),  # osm:building=mosque
    Point("Дом молитвы", 55.987695, 54.710766),  # osm:amenity=place_of_worship
    Point("парк Победы", 56.057188, 54.823390),  # osm:leisure=park
    Point("Мунира", 55.908528, 54.728369),  # osm:amenity=place_of_worship
    Point("Ляля-Тюльпан", 56.055861, 54.819563),  # osm:amenity=place_of_worship
    Point("Мечеть Гуфран", 55.920326, 54.724216),  # osm:amenity=place_of_worship
    Point("Успенский монастырь", 55.996630, 54.692618),  # osm:amenity=place_of_worship
    Point(
        "Мемориальный дом-музей А.Э. Тюлькина", 55.945935, 54.714796
    ),  # osm:tourism=museum
    Point("Демский парк культуры и отдыха", 55.827890, 54.703227),  # osm:leisure=park
    Point("Сад Салавата Юлаева", 55.952719, 54.712515),  # osm:leisure=park
    Point("Софьюшкина аллея", 55.948673, 54.715131),  # osm:leisure=park
    Point("Пушкинский сквер", 55.942461, 54.722618),  # osm:leisure=park
    Point("Театральный сквер", 55.945324, 54.723303),  # osm:leisure=park
    Point(
        "Дёмская районная мечеть", 55.820533, 54.704651
    ),  # osm:amenity=place_of_worship
    Point(
        "Музей 112-й Башкирской кавалерийской дивизии", 55.831510, 54.699470
    ),  # osm:tourism=museum
    Point(
        "Центр детского творчества Советского района", 56.003213, 54.750954
    ),  # osm:amenity=arts_centre
    Point("Парк имени Гастелло", 56.129819, 54.798413),  # osm:leisure=park
    Point(
        "аллея имени Маргариты Куприяновой", 56.072803, 54.818189
    ),  # osm:leisure=park
    Point(
        "Республиканский музей боевой славы", 56.057110, 54.821803
    ),  # osm:tourism=museum
    Point(
        "Парк культуры и отдыха имени Ивана Якутова", 55.950948, 54.740541
    ),  # osm:leisure=park
    Point("Антонов Ан-24", 56.009292, 54.753577),  # osm:tourism=attraction
    Point("сквер Нестерова", 55.957446, 54.745384),  # osm:leisure=park
    Point("сквер Худайбердина", 55.966196, 54.736641),  # osm:leisure=park
    Point("церковь Свет Евангелия", 55.962286, 54.726217),  # osm:tourism=attraction
    Point(
        "Свято-пантелеимоновский храм", 56.082020, 54.817218
    ),  # osm:amenity=place_of_worship
    Point("Волшебный Мир", 56.021515, 54.774423),  # osm:tourism=attraction
    Point("мечеть Иман Нуры", 55.834479, 54.779502),  # osm:amenity=place_of_worship
    Point("мечеть Рамадан", 55.979618, 54.745084),  # osm:amenity=place_of_worship
    Point("Бульвар Славы", 56.032320, 54.790558),  # osm:leisure=park
    Point(
        "Евангелическо-Лютеранская церковь", 55.953980, 54.740816
    ),  # osm:amenity=place_of_worship
    Point(
        "Крестовоздвиженская церковь", 55.919013, 54.733136
    ),  # osm:tourism=attraction
    Point("Свято-Ермогеновский храм", 55.920312, 54.732644),  # osm:tourism=attraction
    Point(
        "Храм Великомученика Георгия Победоносца", 55.857668, 54.791986
    ),  # osm:amenity=place_of_worship
    Point(
        "Храм Святого Апостола Андрея Первозванного", 55.817226, 54.711595
    ),  # osm:amenity=place_of_worship
    Point(
        "Храм Святого Михаила Архангела", 55.881533, 54.812845
    ),  # osm:tourism=attraction
    Point(
        "Часовня Святого Источника", 56.127780, 54.779688
    ),  # osm:amenity=place_of_worship
    Point("Молодёжный сквер", 55.947579, 54.731206),  # osm:leisure=park
    Point("Парк Гастелло", 56.140142, 54.796746),  # osm:leisure=park
    Point(
        "Уфимское епархальное управление", 55.970889, 54.707424
    ),  # osm:building=church
    Point("Музей леса", 56.016884, 54.736085),  # osm:tourism=museum
    Point("Старая водонапорная башня", 55.918835, 54.722087),  # osm:tourism=attraction
    Point("Сквер Юбилейный", 55.982146, 54.739322),  # osm:leisure=park
    Point("Часы", 56.023320, 54.773203),  # osm:amenity=fountain
    Point("сквер Гафури", 55.927610, 54.723672),  # osm:leisure=park
    Point(
        "Памятник воинам интернационалистам", 56.009699, 54.752194
    ),  # osm:historic=memorial
    Point("Сквер Мустая Карима", 55.945825, 54.731717),  # osm:leisure=park
    Point("Аллея радио", 56.059641, 54.772316),  # osm:leisure=park
    Point(
        "Орден Ленина (1957г. и 1936г.)", 55.943434, 54.718403
    ),  # osm:tourism=attraction
    Point("Мини-парк Умного дома", 55.990819, 54.720015),  # osm:leisure=park
    Point("Хамза-Хаджи", 56.057601, 54.764003),  # osm:amenity=place_of_worship
    Point(
        "Храм в честь блаженной Матроны Московской", 56.063805, 54.764728
    ),  # osm:amenity=place_of_worship
    Point("Соборная мечеть", 56.000457, 54.833386),  # osm:amenity=place_of_worship
    Point(
        "Соборная мечеть Ар-Рахим", 55.966122, 54.717020
    ),  # osm:amenity=place_of_worship
    Point("МЕГА Парк", 55.931247, 54.676499),  # osm:leisure=park
    Point("7 девушек", 55.945148, 54.723443),  # osm:amenity=fountain
    Point("Аллея УГНТУ", 56.058783, 54.817845),  # osm:leisure=park
    Point("Парк имени Равиля Бикбаева", 55.982203, 54.696672),  # osm:leisure=park
    Point("Сквер «Уфимская верста»", 55.984889, 54.740555),  # osm:leisure=park
    Point("Сквер Зои Космодемьянской", 55.922746, 54.727432),  # osm:leisure=park
    Point("Мечеть Фатиха", 56.037305, 54.773950),  # osm:amenity=place_of_worship
    Point("сквер Ветеранов", 56.093238, 54.813364),  # osm:leisure=park
    Point("Сквер Зайнаб Биишевой", 55.986135, 54.740274),  # osm:leisure=park
    Point("Колоннада", 55.961472, 54.710016),  # osm:tourism=attraction
    Point("сквер Первому учителю", 55.998178, 54.759315),  # osm:leisure=park
    Point("Сквер им. Варвары Струговец", 55.990207, 54.743337),  # osm:leisure=park
    Point(
        "Лесопарк имени лесоводов Башкортостана", 56.014194, 54.731459
    ),  # osm:leisure=park
    Point("Кордон", 55.894085, 54.690788),  # osm:leisure=garden
    Point(
        "Дендропарк им. лесовода Георгия Рутто", 56.017954, 54.719149
    ),  # osm:leisure=park
    Point("Новая набережная", 55.945098, 54.708434),  # osm:leisure=park
]
