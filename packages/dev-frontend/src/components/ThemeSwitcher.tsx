import React from "react";
import { useColorMode } from 'theme-ui'

export const ThemeSwitcher: React.FC = () => {
    const [colorMode, setColorMode] = useColorMode();

    const switchTheme = () => {
        setColorMode(colorMode === 'light' ? 'dark' : 'light');
    }

    return (
        <div className="theme-switcher">
            <label className="switcher--label">
                <input onChange={switchTheme} className="switcher--input" type="checkbox" checked={colorMode === 'light'} />
                <span className="switcher--slider"></span>
            </label>
        </div>
    )
};

export default ThemeSwitcher;