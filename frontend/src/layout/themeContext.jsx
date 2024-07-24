import React from "react";

const ColorModeContext = React.createContext({
    toggleColorMode: () => { },
    setSetting: (key, value) => {},
    setPrimaryColorLight: (_) => { },
    setSecondaryColorLight: (_) => { },
    setPrimaryColorDark: (_) => { },
    setSecondaryColorDark: (_) => { },
    setAppLogoLight: (_) => { },
    setAppLogoDark: (_) => { },
    setAppLogoFavicon: (_) => { },
    setChatlistLight: (_) => { },
    setChatlistDark: (_) => { },
    setBoxLeftLight: (_) => { },
    setBoxLeftDark: (_) => { },
    setBoxRightLight: (_) => { },
    setBoxRightDark: (_) => { }
  });

export default ColorModeContext;